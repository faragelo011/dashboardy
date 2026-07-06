"""Resolve SQL for cacheable saved-question and widget execution."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.query_engine.schemas import (
    SavedQuestionQueryExecuteRequest,
    WidgetQueryExecuteRequest,
)
from app.questions import repository


class WidgetSqlResolveError(Exception):
    """Raised when widget SQL cannot be resolved from saved question metadata."""

    def __init__(self, error_code: str, message: str) -> None:
        super().__init__(message)
        self.error_code = error_code
        self.message = message


async def resolve_modal_sql(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    payload: SavedQuestionQueryExecuteRequest | WidgetQueryExecuteRequest,
) -> tuple[str, dict[str, Any]] | None:
    if isinstance(payload, WidgetQueryExecuteRequest):
        row = await repository.get_active_saved_question_by_id(
            session,
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            question_id=payload.saved_question_id,
        )
        if row is None:
            raise WidgetSqlResolveError(
                "question_not_found",
                "Saved question not found for widget execution.",
            )
        return row.sql_text, dict(payload.parameters)

    row = await repository.get_active_saved_question_by_id(
        session,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        question_id=payload.saved_question_id,
    )
    if row is None:
        return None
    return row.sql_text, dict(payload.parameters)
