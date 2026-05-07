"""Pydantic request/response models aligned with data-connections OpenAPI."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.connections.enums import (
    ConnectionStatus,
    ConnectionTestStatus,
    FailureCategory,
)


class DataConnectionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: UUID | None = None
    tenant_id: UUID | None = None
    name: str | None = None
    warehouse: str | None = None
    database: str | None = None
    schema_: str | None = Field(default=None, alias="schema")
    status: ConnectionStatus
    has_credentials: bool
    secret_version: int | None = None
    last_tested_at: datetime | None = None
    last_successful_test_at: datetime | None = None
    last_error: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class SnowflakeCredentialsPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    account: str = Field(min_length=1)
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)
    role: str = Field(min_length=1)


class UpsertConnectionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    name: str = Field(min_length=1, max_length=120)
    warehouse: str = Field(min_length=1, max_length=255)
    database: str = Field(min_length=1, max_length=255)
    schema_: str | None = Field(default=None, max_length=255, alias="schema")
    credentials: SnowflakeCredentialsPayload | None = None


class RotateConnectionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    credentials: SnowflakeCredentialsPayload


class ConnectionTestResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    connection: DataConnectionResponse
    test_status: ConnectionTestStatus
    failure_category: FailureCategory | None = None
    sanitized_error: str | None = None


class ErrorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    error_code: str
    message: str
    details: dict | None = None
