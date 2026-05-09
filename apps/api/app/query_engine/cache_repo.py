"""Tenant-isolated JSONB cache persistence (TTL + optional future invalidations)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.query_engine import CacheEntry
from app.query_engine.enums import PresentationClass


@dataclass(frozen=True, slots=True)
class CacheEntryUpsertDTO:
    tenant_id: UUID
    connection_id: UUID
    secret_version: int
    cache_key: str
    payload: dict[str, Any]
    expires_at: datetime
    presentation_class: PresentationClass


async def get_by_tenant_cache_key(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    cache_key: str,
) -> CacheEntry | None:
    stmt = (
        select(CacheEntry)
        .where(
            CacheEntry.tenant_id == tenant_id,
            CacheEntry.cache_key == cache_key,
            CacheEntry.expires_at > func.now(),
        )
        .limit(1)
    )
    row = (await session.execute(stmt)).scalar_one_or_none()
    return row


async def upsert_entry(session: AsyncSession, dto: CacheEntryUpsertDTO) -> UUID:
    ins = pg_insert(CacheEntry).values(
        tenant_id=dto.tenant_id,
        connection_id=dto.connection_id,
        secret_version=dto.secret_version,
        cache_key=dto.cache_key,
        payload=dto.payload,
        expires_at=dto.expires_at,
        presentation_class=dto.presentation_class,
    )
    stmt = ins.on_conflict_do_update(
        constraint="uq_cache_entries_tenant_cache_key",
        set_={
            "connection_id": ins.excluded.connection_id,
            "secret_version": ins.excluded.secret_version,
            "payload": ins.excluded.payload,
            "expires_at": ins.excluded.expires_at,
            "presentation_class": ins.excluded.presentation_class,
            "created_at": func.now(),
        },
    ).returning(CacheEntry.id)
    pk = await session.scalar(stmt)
    assert pk is not None
    return pk


async def delete_expired(session: AsyncSession) -> int:
    stmt = delete(CacheEntry).where(CacheEntry.expires_at < func.now())
    result = await session.execute(stmt)
    return result.rowcount or 0


async def delete_by_identity_prefix(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    cache_key_prefix: str,
) -> int:
    """Bulk invalidations are not wired yet — keep stable signature."""

    _ = session
    _ = tenant_id
    _ = cache_key_prefix
    return 0
