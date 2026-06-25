"""Resolve SQL for cacheable saved-question execution (Feature 005)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.query_engine.schemas import (
    SavedQuestionQueryExecuteRequest,
    WidgetQueryExecuteRequest,
)
from app.questions import repository


async def resolve_modal_sql(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    payload: SavedQuestionQueryExecuteRequest | WidgetQueryExecuteRequest,
) -> tuple[str, dict[str, Any]] | None:
    if isinstance(payload, WidgetQueryExecuteRequest):
        return None

    row = await repository.get_active_saved_question_by_id(
        session,
        tenant_id=tenant_id,
        question_id=payload.saved_question_id,
    )
    if row is None:
        return None
    return row.sql_text, dict(payload.parameters)
