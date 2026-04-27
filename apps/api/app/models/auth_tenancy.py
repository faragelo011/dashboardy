"""Feature 2 ORM models: tenants, workspaces, memberships, grants."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class MembershipRole(StrEnum):
    admin = "admin"
    analyst = "analyst"
    viewer = "viewer"
    external_client = "external_client"


class MembershipStatus(StrEnum):
    active = "active"
    inactive = "inactive"


class CollectionPermission(StrEnum):
    read = "read"
    write = "write"
    admin = "admin"


class AssetType(StrEnum):
    question = "question"
    dashboard = "dashboard"


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class Workspace(Base):
    __tablename__ = "workspaces"
    __table_args__ = (
        UniqueConstraint("tenant_id", name="uq_workspaces_one_per_tenant"),
        UniqueConstraint("tenant_id", "id", name="uq_workspaces_tenant_id_id"),
        UniqueConstraint("tenant_id", "slug", name="uq_workspaces_tenant_slug"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "workspace_id",
            name="uq_memberships_user_workspace",
        ),
        UniqueConstraint(
            "tenant_id",
            "workspace_id",
            "id",
            name="uq_memberships_tenant_workspace_id",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "workspace_id"],
            ["workspaces.tenant_id", "workspaces.id"],
            ondelete="CASCADE",
        ),
        Index(
            "ix_memberships_tenant_workspace_user",
            "tenant_id",
            "workspace_id",
            "user_id",
        ),
        Index("ix_memberships_user_status", "user_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    role: Mapped[MembershipRole] = mapped_column(
        Enum(MembershipRole, name="membership_role", native_enum=True), nullable=False
    )
    status: Mapped[MembershipStatus] = mapped_column(
        Enum(MembershipStatus, name="membership_status", native_enum=True),
        nullable=False,
        server_default=text("'active'::membership_status"),
    )
    invited_email: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    deactivated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class CollectionGrant(Base):
    __tablename__ = "collection_grants"
    __table_args__ = (
        UniqueConstraint(
            "collection_id",
            "membership_id",
            name="uq_collection_grants_collection_member",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "membership_id"],
            ["memberships.tenant_id", "memberships.workspace_id", "memberships.id"],
            ondelete="CASCADE",
        ),
        Index(
            "ix_collection_grants_tenant_workspace_collection",
            "tenant_id",
            "workspace_id",
            "collection_id",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    collection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    membership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    permission: Mapped[CollectionPermission] = mapped_column(
        Enum(CollectionPermission, name="collection_permission", native_enum=True),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class AssetGrant(Base):
    __tablename__ = "asset_grants"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "user_id",
            "asset_type",
            "asset_id",
            name="uq_asset_grants_workspace_user_asset",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "created_by_membership_id"],
            ["memberships.tenant_id", "memberships.workspace_id", "memberships.id"],
            ondelete="CASCADE",
        ),
        Index(
            "ix_asset_grants_tenant_workspace_user_asset",
            "tenant_id",
            "workspace_id",
            "user_id",
            "asset_type",
            "asset_id",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    asset_type: Mapped[AssetType] = mapped_column(
        Enum(AssetType, name="asset_type", native_enum=True), nullable=False
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    can_export: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    created_by_membership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
