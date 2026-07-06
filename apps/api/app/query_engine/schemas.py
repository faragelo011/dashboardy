"""Contract DTOs for query execute (004 OpenAPI YAML)."""

from __future__ import annotations

from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.query_engine.enums import ExecutionStatus, PresentationClass


class ColumnDescriptor(BaseModel):
    model_config = {"extra": "forbid"}

    name: str
    type: str | None = None


class QueryExecuteMeta(BaseModel):
    model_config = {"extra": "forbid"}

    status: ExecutionStatus
    duration_ms: int = Field(ge=0)
    row_count: int = Field(ge=0)
    truncated: bool
    cache_hit: bool
    error_code: str | None = None


class QueryExecuteSuccessResponse(BaseModel):
    model_config = {"extra": "forbid"}

    columns: list[ColumnDescriptor]
    rows: list[list[Any]]
    meta: QueryExecuteMeta


class AdhocQueryExecuteRequest(BaseModel):
    model_config = {"extra": "forbid"}

    mode: Literal["adhoc"] = "adhoc"
    sql_text: str = Field(min_length=1)
    parameters: dict[str, Any] = Field(default_factory=dict)
    bypass_cache: bool = False


class SavedQuestionQueryExecuteRequest(BaseModel):
    model_config = {"extra": "forbid"}

    mode: Literal["saved_question"] = "saved_question"
    saved_question_id: UUID
    parameters: dict[str, Any] = Field(default_factory=dict)
    presentation_class: PresentationClass
    bypass_cache: bool = False
    filter_state_hash: str | None = None


class WidgetQueryExecuteRequest(BaseModel):
    model_config = {"extra": "forbid"}

    mode: Literal["widget"] = "widget"
    dashboard_id: UUID
    widget_id: UUID
    saved_question_id: UUID
    parameters: dict[str, Any] = Field(default_factory=dict)
    presentation_class: PresentationClass
    bypass_cache: bool = False
    filter_state_hash: str | None = None
    cache_ttl_seconds: int | None = None


QueryExecuteRequest = Annotated[
    AdhocQueryExecuteRequest
    | SavedQuestionQueryExecuteRequest
    | WidgetQueryExecuteRequest,
    Field(discriminator="mode"),
]
