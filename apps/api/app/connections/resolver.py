"""Resolve effective connection metadata with local cache invalidation.

This module is used by later features that need effective credentials without
re-querying the DB on every request. It uses `secret_version` as an invalidation
signal and applies a 60s max-staleness window.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.connections import repository
from app.models.data_connections import DataConnection


@dataclass(frozen=True, slots=True)
class ResolvedEffectiveConnection:
    tenant_id: UUID
    connection_id: UUID
    vault_secret_id: str
    secret_version: int
    warehouse: str
    database: str
    schema: str | None
    resolved_at: datetime


class ConnectionResolver:
    def __init__(
        self,
        *,
        clock: Callable[[], datetime] = lambda: datetime.now(tz=UTC),
        max_staleness: timedelta = timedelta(seconds=60),
    ) -> None:
        self._clock = clock
        self._max_staleness = max_staleness
        self._cache: dict[UUID, ResolvedEffectiveConnection] = {}

    async def resolve(
        self, session: AsyncSession, *, tenant_id: UUID
    ) -> ResolvedEffectiveConnection | None:
        now = self._clock()
        cached = self._cache.get(tenant_id)
        if cached and now - cached.resolved_at <= self._max_staleness:
            # Check if version changed; if unchanged within TTL, reuse.
            row = await repository.get_connection_for_tenant(
                session, tenant_id=tenant_id
            )
            if (
                row
                and row.vault_secret_id
                and row.secret_version == cached.secret_version
            ):
                return cached

        row = await repository.get_connection_for_tenant(session, tenant_id=tenant_id)
        resolved = _row_to_effective(row, now=now)
        if resolved is None:
            self._cache.pop(tenant_id, None)
            return None
        self._cache[tenant_id] = resolved
        return resolved


def _row_to_effective(
    row: DataConnection | None, *, now: datetime
) -> ResolvedEffectiveConnection | None:
    if row is None or row.vault_secret_id is None:
        return None
    return ResolvedEffectiveConnection(
        tenant_id=row.tenant_id,
        connection_id=row.id,
        vault_secret_id=row.vault_secret_id,
        secret_version=row.secret_version,
        warehouse=row.warehouse,
        database=row.database,
        schema=row.schema_,
        resolved_at=now,
    )

