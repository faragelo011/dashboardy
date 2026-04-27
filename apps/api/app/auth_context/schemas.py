"""Pydantic schemas for auth context payloads (aligned with Feature 2 OpenAPI)."""

from __future__ import annotations

from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class MembershipRole(StrEnum):
    admin = "admin"
    analyst = "analyst"
    viewer = "viewer"
    external_client = "external_client"


class MembershipStatus(StrEnum):
    active = "active"
    inactive = "inactive"


class UserContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    email: EmailStr


class WorkspaceContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tenant_id: UUID
    workspace_id: UUID
    workspace_name: str
    role: MembershipRole
    membership_status: MembershipStatus


class MeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user: UserContext
    current_workspace: WorkspaceContext
    workspaces: list[WorkspaceContext]
