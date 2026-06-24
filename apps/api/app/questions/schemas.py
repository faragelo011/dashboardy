"""Pydantic schemas aligned with saved-questions.openapi.yaml (Feature 005)."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GrantPermission(StrEnum):
    view = "view"
    edit = "edit"


class QuestionParameterType(StrEnum):
    string = "string"
    number = "number"
    boolean = "boolean"
    date = "date"


class SavedQuestionDetailLevel(StrEnum):
    consumer = "consumer"
    internal = "internal"


class ParameterDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    type: QuestionParameterType
    required: bool
    label: str | None = None
    default: str | int | float | bool | None = None


class CollectionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    sort_order: int = 0


class CollectionUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_updated_at: datetime
    name: str | None = Field(default=None, min_length=1)
    sort_order: int | None = None


class CollectionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    workspace_id: UUID
    name: str
    slug: str
    sort_order: int
    permission: GrantPermission
    created_at: datetime
    updated_at: datetime


class CollectionListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    collections: list[CollectionResponse]


class SavedQuestionSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    collection_id: UUID
    title: str
    description: str | None = None
    permission: GrantPermission
    can_export: bool = False
    created_at: datetime
    updated_at: datetime


class SavedQuestionConsumerDetail(SavedQuestionSummary):
    detail_level: Literal["consumer"] = "consumer"
    parameters: list[ParameterDefinition]


class SavedQuestionInternalDetail(SavedQuestionSummary):
    detail_level: Literal["internal"] = "internal"
    parameters: list[ParameterDefinition]
    sql_text: str


class SavedQuestionCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    collection_id: UUID
    title: str = Field(min_length=1)
    description: str | None = None
    sql_text: str = Field(min_length=1)
    parameters: list[ParameterDefinition]


class SavedQuestionUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_updated_at: datetime
    collection_id: UUID | None = None
    title: str | None = Field(default=None, min_length=1)
    description: str | None = None
    sql_text: str | None = Field(default=None, min_length=1)
    parameters: list[ParameterDefinition] | None = None


class SavedQuestionCloneRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_collection_id: UUID
    title: str | None = None


class SavedQuestionExecuteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    parameters: dict[str, Any] = Field(default_factory=dict)
    bypass_cache: bool = False


class SavedQuestionListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    questions: list[SavedQuestionSummary]


class NormalizedQuestionErrorCode(StrEnum):
    duplicate_collection_name = "duplicate_collection_name"
    collection_not_empty = "collection_not_empty"
    stale_update = "stale_update"
    invalid_parameters = "invalid_parameters"
    export_not_permitted = "export_not_permitted"
    question_not_found = "question_not_found"
    collection_not_found = "collection_not_found"


class NormalizedQuestionError(BaseModel):
    model_config = ConfigDict(extra="forbid")

    error_code: str
    message: str
    details: dict[str, Any] | None = None
