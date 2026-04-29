"""Persistence helpers for Feature 3 data connection rows."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.connections.errors import ConnectionValidationError
from app.connections.redaction import redact_string
from app.models.data_connections import (
    ConnectionManagementAuditRecord,
    ConnectionTestResult,
    DataConnection,
    DbAuditAction,
    DbAuditOutcome,
    DbConnectionStatus,
    DbConnectionTestStatus,
    DbFailureCategory,
)


async def _get_connection_for_tenant(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    connection_id: UUID,
) -> DataConnection | None:
    stmt = select(DataConnection).where(
        DataConnection.id == connection_id,
        DataConnection.tenant_id == tenant_id,
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_connection_for_tenant(
    session: AsyncSession,
    *,
    tenant_id: UUID,
) -> DataConnection | None:
    stmt = select(DataConnection).where(DataConnection.tenant_id == tenant_id)
    return (await session.execute(stmt)).scalar_one_or_none()


async def create_connection(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    name: str,
    warehouse: str,
    database: str,
    schema: str | None,
    created_by_membership_id: UUID,
    status: DbConnectionStatus = DbConnectionStatus.pending_test,
) -> DataConnection:
    row = DataConnection(
        tenant_id=tenant_id,
        name=name,
        warehouse=warehouse,
        database=database,
        schema_=schema,
        status=status,
        created_by_membership_id=created_by_membership_id,
        updated_by_membership_id=created_by_membership_id,
    )
    session.add(row)
    await session.flush()
    return row


async def update_connection_metadata(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    connection_id: UUID,
    name: str,
    warehouse: str,
    database: str,
    schema: str | None,
    updated_by_membership_id: UUID,
) -> DataConnection | None:
    row = await _get_connection_for_tenant(
        session, tenant_id=tenant_id, connection_id=connection_id
    )
    if row is None:
        return None
    row.name = name
    row.warehouse = warehouse
    row.database = database
    row.schema_ = schema
    row.updated_by_membership_id = updated_by_membership_id
    await session.flush()
    return row


async def set_pending_secret(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    connection_id: UUID,
    pending_vault_secret_id: str,
    pending_secret_version: int,
    status: DbConnectionStatus,
    updated_by_membership_id: UUID,
) -> DataConnection | None:
    row = await _get_connection_for_tenant(
        session, tenant_id=tenant_id, connection_id=connection_id
    )
    if row is None:
        return None
    row.pending_vault_secret_id = pending_vault_secret_id
    row.pending_secret_version = pending_secret_version
    row.status = status
    row.updated_by_membership_id = updated_by_membership_id
    await session.flush()
    return row


async def promote_pending_secret(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    connection_id: UUID,
    updated_by_membership_id: UUID,
) -> DataConnection | None:
    row = await _get_connection_for_tenant(
        session, tenant_id=tenant_id, connection_id=connection_id
    )
    if row is None:
        return None
    if row.pending_vault_secret_id is None:
        return row
    if row.pending_secret_version is None:
        raise ConnectionValidationError(
            "pending_secret_version is required when pending_vault_secret_id is set"
        )
    row.vault_secret_id = row.pending_vault_secret_id
    row.secret_version = row.pending_secret_version
    row.pending_vault_secret_id = None
    row.pending_secret_version = None
    row.status = DbConnectionStatus.active
    row.updated_by_membership_id = updated_by_membership_id
    await session.flush()
    return row


async def clear_pending_secret(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    connection_id: UUID,
    updated_by_membership_id: UUID,
) -> DataConnection | None:
    row = await _get_connection_for_tenant(
        session, tenant_id=tenant_id, connection_id=connection_id
    )
    if row is None:
        return None
    row.pending_vault_secret_id = None
    row.pending_secret_version = None
    row.updated_by_membership_id = updated_by_membership_id
    await session.flush()
    return row


async def write_connection_test_result(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    connection_id: UUID,
    attempted_by_membership_id: UUID,
    credential_version: int,
    status: DbConnectionTestStatus,
    failure_category: DbFailureCategory | None,
    sanitized_error: str | None,
    started_at: datetime,
    completed_at: datetime,
) -> ConnectionTestResult:
    safe_error = (
        None if sanitized_error is None else redact_string(sanitized_error)
    )
    row = ConnectionTestResult(
        tenant_id=tenant_id,
        connection_id=connection_id,
        attempted_by_membership_id=attempted_by_membership_id,
        credential_version=credential_version,
        status=status,
        failure_category=failure_category,
        sanitized_error=safe_error,
        started_at=started_at,
        completed_at=completed_at,
    )
    session.add(row)
    await session.flush()
    return row


async def write_management_audit(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    connection_id: UUID | None,
    actor_membership_id: UUID,
    action: DbAuditAction,
    outcome: DbAuditOutcome,
    failure_category: DbFailureCategory | None = None,
    sanitized_message: str | None = None,
) -> ConnectionManagementAuditRecord:
    safe_message = (
        None if sanitized_message is None else redact_string(sanitized_message)
    )
    row = ConnectionManagementAuditRecord(
        tenant_id=tenant_id,
        connection_id=connection_id,
        actor_membership_id=actor_membership_id,
        action=action,
        outcome=outcome,
        failure_category=failure_category,
        sanitized_message=safe_message,
    )
    session.add(row)
    await session.flush()
    return row
