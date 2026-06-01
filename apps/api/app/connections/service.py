"""Connection domain service shell (behavior filled in by user story tasks)."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime
from uuid import UUID

from sqlalchemy.exc import IntegrityError

from app.connections.authz import require_admin_membership
from app.connections.enums import FailureCategory
from app.connections.errors import (
    AuthzDeniedError,
    ConnectionConflictError,
    ConnectionValidationError,
    DependencyUnavailableError,
)
from app.connections.protocols import ConnectionRepositoryProtocol
from app.connections.redaction import redact_string
from app.connections.schemas import (
    ConnectionTestResponse,
    DataConnectionResponse,
    RotateConnectionRequest,
    SnowflakeCredentialsPayload,
    UpsertConnectionRequest,
)
from app.connections.snowflake import SnowflakeTester, categorize_snowflake_failure
from app.connections.vault import VaultClient
from app.models.data_connections import (
    DataConnection,
    DbAuditAction,
    DbAuditOutcome,
    DbConnectionStatus,
    DbConnectionTestStatus,
    DbFailureCategory,
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
            pending_version = _next_vault_credential_version(
                secret_version=row.secret_version,
                pending_secret_version=row.pending_secret_version,
            )
            secret_name = _vault_secret_name(
                tenant_id=actor.tenant_id,
                connection_id=row.id,
                version=pending_version,
            )
            try:
                secret_id = await self._vault.store_secret(
                    name=secret_name,
                    secret_payload=_vault_snowflake_secret_payload(creds),
                )
            except DependencyUnavailableError as exc:
                audit_action = (
                    DbAuditAction.create if created else DbAuditAction.metadata_update
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

    async def test_connection(
        self,
        *,
        session,
        actor: ResolvedTenancy,
    ) -> ConnectionTestResponse:
        require_admin_membership(actor)
        started_at = self.now()

        row = await self._repository.get_connection_for_tenant(
            session, tenant_id=actor.tenant_id
        )
        if row is None:
            from app.connections.errors import ConnectionNotFoundError

            raise ConnectionNotFoundError("Connection not configured.")

        secret_id = row.pending_vault_secret_id or row.vault_secret_id
        credential_version = row.pending_secret_version or row.secret_version
        if not secret_id:
            from app.connections.errors import ConnectionNotFoundError

            raise ConnectionNotFoundError("Connection credentials not configured.")

        try:
            secret = await self._vault.read_secret(secret_id=secret_id)
        except DependencyUnavailableError as exc:
            completed_at = self.now()
            safe_error = redact_string(str(exc) or "Dependency unavailable.")
            failure_category = FailureCategory.unknown
            db_failure_category = DbFailureCategory.unknown

            await self._repository.write_connection_test_result(
                session,
                tenant_id=actor.tenant_id,
                connection_id=row.id,
                attempted_by_membership_id=actor.membership_id,
                credential_version=credential_version,
                status=DbConnectionTestStatus.failure,
                failure_category=db_failure_category,
                sanitized_error=safe_error,
                started_at=started_at,
                completed_at=completed_at,
            )
            await self._repository.update_connection_test_state(
                session,
                tenant_id=actor.tenant_id,
                connection_id=row.id,
                status=DbConnectionStatus.test_failed,
                last_tested_at=completed_at,
                last_successful_test_at=None,
                last_error=safe_error,
                updated_by_membership_id=actor.membership_id,
            )
            await self._repository.write_management_audit(
                session,
                tenant_id=actor.tenant_id,
                connection_id=row.id,
                actor_membership_id=actor.membership_id,
                action=DbAuditAction.test,
                outcome=DbAuditOutcome.failure,
                failure_category=db_failure_category,
                sanitized_message=safe_error,
            )

            connection = await self.get_connection_metadata(
                session=session, actor=actor
            )
            return ConnectionTestResponse(
                connection=connection,
                test_status="failure",
                failure_category=failure_category,
                sanitized_error=safe_error,
            )
        account = secret.get("account", "").strip()
        username = secret.get("username", "").strip()
        password = secret.get("password", "")
        if not isinstance(password, str):
            password = str(password)
        role = secret.get("role", "").strip()
        pk_pem = secret.get("private_key_pem", "").strip()
        pk_pp = secret.get("private_key_passphrase")
        if pk_pp is not None:
            pk_pp = str(pk_pp)
            if not pk_pp.strip():
                pk_pp = None

        if pk_pem:
            if not (account and username and role):
                return await self._record_failed_test(
                    session=session,
                    actor=actor,
                    row=row,
                    credential_version=credential_version,
                    started_at=started_at,
                    failure_category=FailureCategory.unknown,
                    safe_error="Stored credentials are incomplete.",
                )
            pw_arg: str | None = None
            pk_arg = pk_pem
            pp_arg = pk_pp
        else:
            if not (account and username and password and role):
                return await self._record_failed_test(
                    session=session,
                    actor=actor,
                    row=row,
                    credential_version=credential_version,
                    started_at=started_at,
                    failure_category=FailureCategory.unknown,
                    safe_error="Stored credentials are incomplete.",
                )
            pw_arg = password
            pk_arg = None
            pp_arg = None

        try:
            await self._snowflake_tester.run_connectivity_check(
                account=account,
                user=username,
                password=pw_arg,
                private_key_pem=pk_arg,
                private_key_passphrase=pp_arg,
                warehouse=row.warehouse,
                database=row.database,
                schema=row.schema_,
                role=role,
            )
        except Exception as exc:
            completed_at = self.now()
            failure_category = categorize_snowflake_failure(exc)
            safe_error = redact_string(str(exc) or "Connection test failed.")

            await self._repository.write_connection_test_result(
                session,
                tenant_id=actor.tenant_id,
                connection_id=row.id,
                attempted_by_membership_id=actor.membership_id,
                credential_version=credential_version,
                status=DbConnectionTestStatus.failure,
                failure_category=DbFailureCategory(failure_category.value),
                sanitized_error=safe_error,
                started_at=started_at,
                completed_at=completed_at,
            )
            await self._repository.update_connection_test_state(
                session,
                tenant_id=actor.tenant_id,
                connection_id=row.id,
                status=DbConnectionStatus.test_failed,
                last_tested_at=completed_at,
                last_successful_test_at=row.last_successful_test_at,
                last_error=safe_error,
                updated_by_membership_id=actor.membership_id,
            )
            await self._repository.write_management_audit(
                session,
                tenant_id=actor.tenant_id,
                connection_id=row.id,
                actor_membership_id=actor.membership_id,
                action=DbAuditAction.test,
                outcome=DbAuditOutcome.failure,
                failure_category=DbFailureCategory(failure_category.value),
                sanitized_message=safe_error,
            )

            connection = await self.get_connection_metadata(
                session=session, actor=actor
            )
            return ConnectionTestResponse(
                connection=connection,
                test_status="failure",
                failure_category=failure_category,
                sanitized_error=safe_error,
            )

        # Success
        completed_at = self.now()
        await self._repository.write_connection_test_result(
            session,
            tenant_id=actor.tenant_id,
            connection_id=row.id,
            attempted_by_membership_id=actor.membership_id,
            credential_version=credential_version,
            status=DbConnectionTestStatus.success,
            failure_category=None,
            sanitized_error=None,
            started_at=started_at,
            completed_at=completed_at,
        )

        # Promote pending secret if present.
        if row.pending_vault_secret_id is not None:
            await self._repository.promote_pending_secret(
                session,
                tenant_id=actor.tenant_id,
                connection_id=row.id,
                updated_by_membership_id=actor.membership_id,
            )

        await self._repository.update_connection_test_state(
            session,
            tenant_id=actor.tenant_id,
            connection_id=row.id,
            status=DbConnectionStatus.active,
            last_tested_at=completed_at,
            last_successful_test_at=completed_at,
            last_error=None,
            updated_by_membership_id=actor.membership_id,
        )
        await self._repository.write_management_audit(
            session,
            tenant_id=actor.tenant_id,
            connection_id=row.id,
            actor_membership_id=actor.membership_id,
            action=DbAuditAction.test,
            outcome=DbAuditOutcome.success,
            failure_category=None,
            sanitized_message=None,
        )

        connection = await self.get_connection_metadata(session=session, actor=actor)
        return ConnectionTestResponse(connection=connection, test_status="success")

    async def _record_failed_test(
        self,
        *,
        session,
        actor: ResolvedTenancy,
        row: DataConnection,
        credential_version: int,
        started_at: datetime,
        failure_category: FailureCategory,
        safe_error: str,
    ) -> ConnectionTestResponse:
        completed_at = self.now()
        safe_error = redact_string(safe_error)
        db_failure_category = DbFailureCategory(failure_category.value)
        await self._repository.write_connection_test_result(
            session,
            tenant_id=actor.tenant_id,
            connection_id=row.id,
            attempted_by_membership_id=actor.membership_id,
            credential_version=credential_version,
            status=DbConnectionTestStatus.failure,
            failure_category=db_failure_category,
            sanitized_error=safe_error,
            started_at=started_at,
            completed_at=completed_at,
        )
        await self._repository.update_connection_test_state(
            session,
            tenant_id=actor.tenant_id,
            connection_id=row.id,
            status=DbConnectionStatus.test_failed,
            last_tested_at=completed_at,
            last_successful_test_at=row.last_successful_test_at,
            last_error=safe_error,
            updated_by_membership_id=actor.membership_id,
        )
        await self._repository.write_management_audit(
            session,
            tenant_id=actor.tenant_id,
            connection_id=row.id,
            actor_membership_id=actor.membership_id,
            action=DbAuditAction.test,
            outcome=DbAuditOutcome.failure,
            failure_category=db_failure_category,
            sanitized_message=safe_error,
        )

        connection = await self.get_connection_metadata(session=session, actor=actor)
        return ConnectionTestResponse(
            connection=connection,
            test_status="failure",
            failure_category=failure_category,
            sanitized_error=safe_error,
        )

    async def resolve_active_execution_credentials(
        self,
        *,
        session,
        tenant_id: UUID,
    ) -> (
        tuple[
            DataConnection,
            dict[str, str],
        ]
        | None
    ):
        """Snowflake Vault material for read-only analytic execution paths.

        Reuses Vault HTTP read semantics already implemented for connection testing.
        Returns ``None`` when no **active**, fully configured connection exists.
        """

        row = await self._repository.get_connection_for_tenant(
            session, tenant_id=tenant_id
        )
        if row is None or row.status != DbConnectionStatus.active:
            return None
        if not row.vault_secret_id:
            return None
        secret = await self._vault.read_secret(secret_id=row.vault_secret_id)
        account = secret.get("account", "").strip()
        username = secret.get("username", "").strip()
        password = secret.get("password", "")
        if not isinstance(password, str):
            password = str(password)
        role = secret.get("role", "").strip()
        pk_pem = secret.get("private_key_pem", "").strip()
        pk_pp = secret.get("private_key_passphrase")
        if pk_pp is not None:
            pk_pp = str(pk_pp)
            if not pk_pp.strip():
                pk_pp = None

        if pk_pem:
            if not (account and username and role):
                raise ConnectionValidationError("Stored credentials are incomplete.")
        else:
            if not (account and username and password and role):
                raise ConnectionValidationError("Stored credentials are incomplete.")
        # Downstream callers must avoid logging credential payloads / raw JWT.
        normalized: dict[str, str] = {
            "account": account,
            "username": username,
            "role": role,
        }
        if pk_pem:
            normalized["private_key_pem"] = pk_pem
            if pk_pp is not None:
                normalized["private_key_passphrase"] = pk_pp
        else:
            normalized["password"] = password
        for optional in ("warehouse", "database", "schema"):
            raw = secret.get(optional)
            if raw is not None:
                trimmed = str(raw).strip()
                if trimmed:
                    normalized[optional] = trimmed
        return row, normalized

    async def rotate_credentials(
        self,
        *,
        session,
        actor: ResolvedTenancy,
        payload: RotateConnectionRequest,
    ) -> DataConnectionResponse:
        require_admin_membership(actor)

        row = await self._repository.get_connection_for_tenant(
            session, tenant_id=actor.tenant_id
        )
        if row is None or row.vault_secret_id is None:
            from app.connections.errors import ConnectionNotFoundError

            raise ConnectionNotFoundError("Active connection credentials are required.")

        creds = payload.credentials
        pending_version = _next_vault_credential_version(
            secret_version=row.secret_version,
            pending_secret_version=row.pending_secret_version,
        )
        secret_name = _vault_secret_name(
            tenant_id=actor.tenant_id,
            connection_id=row.id,
            version=pending_version,
        )
        try:
            secret_id = await self._vault.store_secret(
                name=secret_name,
                secret_payload=_vault_snowflake_secret_payload(creds),
            )
        except DependencyUnavailableError as exc:
            safe_error = redact_string(str(exc) or "Dependency unavailable.")
            await self._repository.write_management_audit(
                session,
                tenant_id=actor.tenant_id,
                connection_id=row.id,
                actor_membership_id=actor.membership_id,
                action=DbAuditAction.rotate,
                outcome=DbAuditOutcome.failure,
                failure_category=DbFailureCategory.unknown,
                sanitized_message=safe_error,
            )
            raise
        await self._repository.set_pending_rotation_secret(
            session,
            tenant_id=actor.tenant_id,
            connection_id=row.id,
            pending_vault_secret_id=secret_id,
            pending_secret_version=pending_version,
            updated_by_membership_id=actor.membership_id,
        )
        await self._repository.write_management_audit(
            session,
            tenant_id=actor.tenant_id,
            connection_id=row.id,
            actor_membership_id=actor.membership_id,
            action=DbAuditAction.rotate,
            outcome=DbAuditOutcome.success,
            failure_category=None,
            sanitized_message=None,
        )

        return await self.get_connection_metadata(session=session, actor=actor)


def _next_vault_credential_version(
    *,
    secret_version: int | None,
    pending_secret_version: int | None,
) -> int:
    """Next version for `tenant:…/snowflake:vN` Vault names.

    When a pending secret already reserved ``vK`` but the effective
    ``secret_version`` is still lower (credentials not tested yet), the next
    stored secret must use ``v(K+1)``, not ``v(effective+1)``, or Vault returns
    409 for duplicate name.
    """

    effective = secret_version or 0
    pending = pending_secret_version or 0
    return max(effective, pending) + 1


def _vault_snowflake_secret_payload(
    creds: SnowflakeCredentialsPayload,
) -> dict[str, str]:
    out: dict[str, str] = {
        "account": creds.account.strip(),
        "username": creds.username.strip(),
        "role": creds.role.strip(),
    }
    if creds.password and creds.password.strip():
        out["password"] = creds.password
    if creds.private_key_pem and creds.private_key_pem.strip():
        out["private_key_pem"] = creds.private_key_pem.strip()
    if creds.private_key_passphrase:
        out["private_key_passphrase"] = creds.private_key_passphrase
    return out


def _vault_secret_name(*, tenant_id: UUID, connection_id: UUID, version: int) -> str:
    # Keep deterministic, secret-free naming for Vault auditing/ops.
    return f"tenant:{tenant_id}/connection:{connection_id}/snowflake:v{version}"
