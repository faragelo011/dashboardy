"""Pydantic schemas for admin member and grant operations (Feature 2 OpenAPI)."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.common.enums import MembershipRole, MembershipStatus


class AssetType(StrEnum):
    question = "question"
    dashboard = "dashboard"


class Member(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    user_id: UUID
    email: EmailStr
    role: MembershipRole
    status: MembershipStatus
    created_at: datetime
    deactivated_at: datetime | None = None


class InviteMemberRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    role: MembershipRole


class UpdateMemberRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: MembershipRole | None = None
    status: MembershipStatus | None = None

    @model_validator(mode="after")
    def require_role_or_status(self) -> Self:
        if self.role is None and self.status is None:
            raise ValueError("At least one of `role` or `status` must be provided")
        return self


class CreateAssetGrantRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID
    asset_type: AssetType
    asset_id: UUID
    can_export: bool = False


class AssetGrant(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    user_id: UUID
    asset_type: AssetType
    asset_id: UUID
    can_export: bool
    created_at: datetime


class MemberListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    members: list[Member] = Field(default_factory=list)


class AssetGrantListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    grants: list[AssetGrant] = Field(default_factory=list)
