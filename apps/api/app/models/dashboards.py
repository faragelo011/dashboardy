"""Feature 006 ORM models: dashboards, dashboard widgets, and dashboard grants."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
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
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.auth_tenancy import CollectionPermission
from app.models.base import Base


class Dashboard(Base):
    __tablename__ = "dashboards"
    __table_args__ = (
        UniqueConstraint("tenant_id", "id", name="uq_dashboards_tenant_id_id"),
        UniqueConstraint(
            "tenant_id",
            "workspace_id",
            "id",
            name="uq_dashboards_tenant_workspace_id",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "workspace_id"],
            ["workspaces.tenant_id", "workspaces.id"],
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "collection_id"],
            ["collections.tenant_id", "collections.workspace_id", "collections.id"],
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "created_by_membership_id"],
            ["memberships.tenant_id", "memberships.workspace_id", "memberships.id"],
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "updated_by_membership_id"],
            ["memberships.tenant_id", "memberships.workspace_id", "memberships.id"],
            ondelete="RESTRICT",
        ),
        Index(
            "ix_dashboards_tenant_workspace_collection_deleted_title",
            "tenant_id",
            "workspace_id",
            "collection_id",
            "deleted_at",
            "title",
        ),
        Index(
            "ix_dashboards_tenant_workspace_deleted_updated",
            "tenant_id",
            "workspace_id",
            "deleted_at",
            "updated_at",
        ),
        Index(
            "uq_dashboards_collection_active_title",
            "collection_id",
            text("lower(trim(title))"),
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
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
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    definition: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{\"layout_version\": 1, \"global_filters\": []}'::jsonb"),
    )
    created_by_membership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
    )
    updated_by_membership_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
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
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class DashboardWidget(Base):
    __tablename__ = "dashboard_widgets"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "workspace_id",
            "id",
            name="uq_dashboard_widgets_tenant_workspace_id",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "dashboard_id"],
            ["dashboards.tenant_id", "dashboards.workspace_id", "dashboards.id"],
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "saved_question_id"],
            [
                "saved_questions.tenant_id",
                "saved_questions.workspace_id",
                "saved_questions.id",
            ],
            ondelete="RESTRICT",
        ),
        Index(
            "ix_dashboard_widgets_dashboard_deleted",
            "dashboard_id",
            "deleted_at",
        ),
        Index(
            "ix_dashboard_widgets_tenant_workspace_saved_question",
            "tenant_id",
            "workspace_id",
            "saved_question_id",
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
    dashboard_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    saved_question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    widget_type: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    layout: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    config: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    filter_bindings: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    filter_overrides: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
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
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class DashboardGrant(Base):
    __tablename__ = "dashboard_grants"
    __table_args__ = (
        UniqueConstraint(
            "dashboard_id",
            "membership_id",
            name="uq_dashboard_grants_dashboard_member",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "dashboard_id"],
            ["dashboards.tenant_id", "dashboards.workspace_id", "dashboards.id"],
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "membership_id"],
            ["memberships.tenant_id", "memberships.workspace_id", "memberships.id"],
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "created_by_membership_id"],
            ["memberships.tenant_id", "memberships.workspace_id", "memberships.id"],
            ondelete="RESTRICT",
        ),
        Index(
            "ix_dashboard_grants_tenant_workspace_dashboard",
            "tenant_id",
            "workspace_id",
            "dashboard_id",
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
    dashboard_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
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
    created_by_membership_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
