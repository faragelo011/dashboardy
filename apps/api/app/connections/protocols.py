"""Structural protocols for `ConnectionService` dependencies."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Protocol, runtime_checkable
from uuid import UUID

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

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


@runtime_checkable
class ConnectionRepositoryProtocol(Protocol):
    """Matches `app.connections.repository` module-level async functions."""

    @staticmethod
    async def get_connection_for_tenant(
        session: AsyncSession, *, tenant_id: UUID
    ) -> DataConnection | None: ...

    @staticmethod
    async def create_connection(
        session: AsyncSession,
        *,
        tenant_id: UUID,
        name: str,
        warehouse: str,
        database: str,
        schema: str | None,
        created_by_membership_id: UUID,
        status: DbConnectionStatus,
    ) -> DataConnection: ...

    @staticmethod
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
    ) -> DataConnection | None: ...

    @staticmethod
    async def set_pending_secret(
        session: AsyncSession,
        *,
        tenant_id: UUID,
        connection_id: UUID,
        pending_vault_secret_id: str,
        pending_secret_version: int,
        status: DbConnectionStatus,
        updated_by_membership_id: UUID,
    ) -> DataConnection | None: ...

    @staticmethod
    async def promote_pending_secret(
        session: AsyncSession,
        *,
        tenant_id: UUID,
        connection_id: UUID,
        updated_by_membership_id: UUID,
    ) -> DataConnection | None: ...

    @staticmethod
    async def clear_pending_secret(
        session: AsyncSession,
        *,
        tenant_id: UUID,
        connection_id: UUID,
        updated_by_membership_id: UUID,
    ) -> DataConnection | None: ...

    @staticmethod
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
    ) -> ConnectionTestResult: ...

    @staticmethod
    async def write_management_audit(
        session: AsyncSession,
        *,
        tenant_id: UUID,
        connection_id: UUID | None,
        actor_membership_id: UUID,
        action: DbAuditAction,
        outcome: DbAuditOutcome,
        failure_category: DbFailureCategory | None,
        sanitized_message: str | None,
    ) -> ConnectionManagementAuditRecord: ...
