"""Connection domain service shell (behavior filled in by user story tasks)."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime
from uuid import UUID

from sqlalchemy.exc import IntegrityError

from app.connections.authz import require_admin_membership
from app.connections.errors import (
    AuthzDeniedError,
    ConnectionConflictError,
    ConnectionValidationError,
    DependencyUnavailableError,
)
from app.connections.protocols import ConnectionRepositoryProtocol
from app.connections.schemas import DataConnectionResponse, UpsertConnectionRequest
from app.connections.snowflake import SnowflakeTester
from app.connections.vault import VaultClient
from app.models.data_connections import (
    DbAuditAction,
    DbAuditOutcome,
    DbConnectionStatus,
)
from app.tenancy.resolver import ResolvedTenancy


class ConnectionService:
    """Coordinates repository, Vault, and Snowflake adapters.

    Constructor injection keeps routes thin and tests deterministic.
    """

    def __init__(
        self,
        *,
        repository: ConnectionRepositoryProtocol,
        vault: VaultClient,
        snowflake_tester: SnowflakeTester,
        clock: Callable[[], datetime],
    ) -> None:
        self._repository = repository
        self._vault = vault
        self._snowflake_tester = snowflake_tester
        self._clock = clock

    @property
    def repository(self) -> ConnectionRepositoryProtocol:
        return self._repository

    @property
    def vault(self) -> VaultClient:
        return self._vault

    @property
    def snowflake_tester(self) -> SnowflakeTester:
        return self._snowflake_tester

    def now(self) -> datetime:
        return self._clock()

    async def get_connection_metadata(
        self,
        *,
        session,
        actor: ResolvedTenancy,
    ) -> DataConnectionResponse:
        require_admin_membership(actor)
        row = await self._repository.get_connection_for_tenant(
            session, tenant_id=actor.tenant_id
        )
        if row is None:
            return DataConnectionResponse(
                status="not_configured",
                has_credentials=False,
            )

        has_credentials = bool(row.vault_secret_id or row.pending_vault_secret_id)
        return DataConnectionResponse(
            id=row.id,
            tenant_id=row.tenant_id,
            name=row.name,
            warehouse=row.warehouse,
            database=row.database,
            schema=row.schema_,
            status=row.status.value,
            has_credentials=has_credentials,
            secret_version=row.secret_version if has_credentials else None,
            last_tested_at=row.last_tested_at,
            last_successful_test_at=row.last_successful_test_at,
            last_error=row.last_error,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    async def upsert_connection(
        self,
        *,
        session,
        actor: ResolvedTenancy,
        payload: UpsertConnectionRequest,
    ) -> tuple[DataConnectionResponse, bool]:
        """Create or update a tenant's single connection.

        Returns: (response, created)
        """

        try:
            require_admin_membership(actor)
        except AuthzDeniedError as exc:
            raise exc

        name = payload.name.strip()
        warehouse = payload.warehouse.strip()
        database = payload.database.strip()
        schema = payload.schema_.strip() if isinstance(payload.schema_, str) else None
        if not name or not warehouse or not database:
            raise ConnectionValidationError(
                "name, warehouse, and database are required",
                details={"fields": ["name", "warehouse", "database"]},
            )

        row = await self._repository.get_connection_for_tenant(
            session, tenant_id=actor.tenant_id
        )
        created = False
        if row is None:
            try:
                row = await self._repository.create_connection(
                    session,
                    tenant_id=actor.tenant_id,
                    name=name,
                    warehouse=warehouse,
                    database=database,
                    schema=schema,
                    created_by_membership_id=actor.membership_id,
                    status=DbConnectionStatus.not_configured,
                )
            except IntegrityError as exc:
                raise ConnectionConflictError(
                    "Connection already exists for this tenant."
                ) from exc
            created = True

        # Always update metadata first.
        if not created:
            updated = await self._repository.update_connection_metadata(
                session,
                tenant_id=actor.tenant_id,
                connection_id=row.id,
                name=name,
                warehouse=warehouse,
                database=database,
                schema=schema,
                updated_by_membership_id=actor.membership_id,
            )
            if updated is None:
                # Should be impossible due to tenant-bound lookups, but keep safe.
                raise ConnectionValidationError("Connection could not be updated.")
            row = updated

        # Credentials are optional for metadata-only updates.
        if payload.credentials is not None:
            creds = payload.credentials
            secret_name = _vault_secret_name(
                tenant_id=actor.tenant_id,
                connection_id=row.id,
                version=(row.secret_version or 0) + 1,
            )
            try:
                secret_id = await self._vault.store_secret(
                    name=secret_name,
                    secret_payload={
                        "account": creds.account,
                        "username": creds.username,
                        "password": creds.password,
                        "role": creds.role,
                    },
                )
            except DependencyUnavailableError as exc:
                audit_action = (
                    DbAuditAction.create
                    if created
                    else DbAuditAction.metadata_update
                )
                await self._repository.write_management_audit(
                    session,
                    tenant_id=actor.tenant_id,
                    connection_id=row.id,
                    actor_membership_id=actor.membership_id,
                    action=audit_action,
                    outcome=DbAuditOutcome.failure,
                    failure_category=None,
                    sanitized_message=str(exc),
                )
                raise

            pending_version = (row.secret_version or 0) + 1
            updated = await self._repository.set_pending_secret(
                session,
                tenant_id=actor.tenant_id,
                connection_id=row.id,
                pending_vault_secret_id=secret_id,
                pending_secret_version=pending_version,
                status=DbConnectionStatus.pending_test,
                updated_by_membership_id=actor.membership_id,
            )
            if updated is None:
                raise ConnectionValidationError("Connection could not be updated.")
            row = updated

        await self._repository.write_management_audit(
            session,
            tenant_id=actor.tenant_id,
            connection_id=row.id,
            actor_membership_id=actor.membership_id,
            action=DbAuditAction.create if created else DbAuditAction.metadata_update,
            outcome=DbAuditOutcome.success,
            failure_category=None,
            sanitized_message=None,
        )

        response = await self.get_connection_metadata(session=session, actor=actor)
        return response, created


def _vault_secret_name(*, tenant_id: UUID, connection_id: UUID, version: int) -> str:
    # Keep deterministic, secret-free naming for Vault auditing/ops.
    return f"tenant:{tenant_id}/connection:{connection_id}/snowflake:v{version}"
