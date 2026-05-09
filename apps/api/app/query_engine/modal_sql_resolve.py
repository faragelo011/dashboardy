"""Resolve SQL for cacheable modes until Feature 5–6 assets exist.

Return ``None`` when rows are unavailable so the pipeline returns **422**.
Tests may monkeypatch this module.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.query_engine.schemas import (
    SavedQuestionQueryExecuteRequest,
    WidgetQueryExecuteRequest,
)


async def resolve_modal_sql(
    _session: AsyncSession,
    *,
    tenant_id: UUID,
    payload: SavedQuestionQueryExecuteRequest | WidgetQueryExecuteRequest,
) -> tuple[str, dict[str, Any]] | None:
    _ = tenant_id
    _ = payload
    return None
