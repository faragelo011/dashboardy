"""Pydantic schemas for auth context payloads (aligned with Feature 2 OpenAPI)."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.common.enums import MembershipRole, MembershipStatus


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
