"""Pydantic schemas for admin member and grant operations (Feature 2 OpenAPI)."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class MembershipRole(StrEnum):
    admin = "admin"
    analyst = "analyst"
    viewer = "viewer"
    external_client = "external_client"


class MembershipStatus(StrEnum):
    active = "active"
    inactive = "inactive"


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

    def model_post_init(self, __context: object) -> None:  # noqa: D401
        if self.role is None and self.status is None:
            msg = "At least one of `role` or `status` must be provided"
            raise ValueError(msg)


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
