"""Test factories for Feature 3 connection rows."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

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


def build_data_connection(
    *,
    tenant_id: uuid.UUID | None = None,
    membership_id: uuid.UUID | None = None,
    status: DbConnectionStatus = DbConnectionStatus.pending_test,
) -> DataConnection:
    tid = tenant_id or uuid.uuid4()
    mid = membership_id or uuid.uuid4()
    return DataConnection(
        tenant_id=tid,
        name="Test connection",
        warehouse="WH",
        database="DB",
        schema_="PUBLIC",
        status=status,
        created_by_membership_id=mid,
        updated_by_membership_id=mid,
    )


def build_connection_test_result(
    *,
    tenant_id: uuid.UUID,
    connection_id: uuid.UUID,
    membership_id: uuid.UUID,
    credential_version: int = 1,
    status: DbConnectionTestStatus = DbConnectionTestStatus.success,
    failure_category: DbFailureCategory | None = None,
    sanitized_error: str | None = None,
    started_at: datetime | None = None,
    completed_at: datetime | None = None,
) -> ConnectionTestResult:
    now = datetime.now(tz=UTC)
    return ConnectionTestResult(
        tenant_id=tenant_id,
        connection_id=connection_id,
        attempted_by_membership_id=membership_id,
        credential_version=credential_version,
        status=status,
        failure_category=failure_category,
        sanitized_error=sanitized_error,
        started_at=started_at or now,
        completed_at=completed_at or now,
    )


def build_management_audit(
    *,
    tenant_id: uuid.UUID,
    actor_membership_id: uuid.UUID,
    connection_id: uuid.UUID | None = None,
    action: DbAuditAction = DbAuditAction.create,
    outcome: DbAuditOutcome = DbAuditOutcome.success,
    failure_category: DbFailureCategory | None = None,
    sanitized_message: str | None = None,
) -> ConnectionManagementAuditRecord:
    return ConnectionManagementAuditRecord(
        tenant_id=tenant_id,
        connection_id=connection_id,
        actor_membership_id=actor_membership_id,
        action=action,
        outcome=outcome,
        failure_category=failure_category,
        sanitized_message=sanitized_message,
    )
