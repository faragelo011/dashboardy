"""Insert-only audit persistence (spec FR-020).

Workers may die before flush; still try to flush one audit row before responding.
"""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.query_engine import QueryAuditLog
from app.query_engine.enums import ExecutionStatus


@dataclass(frozen=True, slots=True)
class QueryAuditLogInsertDTO:
    tenant_id: UUID
    workspace_id: UUID
    user_id: UUID
    connection_id: UUID | None
    saved_question_id: UUID | None
    dashboard_id: UUID | None
    sql_hash: str
    bound_parameters_hash: str
    row_count: int
    bytes_scanned: int | None
    duration_ms: int
    cache_hit: bool
    status: ExecutionStatus
    error_code: str | None


async def insert_audit_log(session: AsyncSession, dto: QueryAuditLogInsertDTO) -> UUID:
    row = QueryAuditLog(
        tenant_id=dto.tenant_id,
        workspace_id=dto.workspace_id,
        user_id=dto.user_id,
        connection_id=dto.connection_id,
        saved_question_id=dto.saved_question_id,
        dashboard_id=dto.dashboard_id,
        sql_hash=dto.sql_hash,
        bound_parameters_hash=dto.bound_parameters_hash,
        row_count=dto.row_count,
        bytes_scanned=dto.bytes_scanned,
        duration_ms=dto.duration_ms,
        cache_hit=dto.cache_hit,
        status=dto.status,
        error_code=dto.error_code,
    )
    session.add(row)
    await session.flush()
    return row.id
