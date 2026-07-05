"""Feature 6: dashboards, dashboard widgets, and dashboard grants.

Revision ID: 0015
Revises: 0014
Create Date: 2026-07-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0015"
down_revision: str | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    collection_permission = postgresql.ENUM(
        "view",
        "edit",
        name="collection_permission",
        create_type=False,
    )

    op.create_table(
        "dashboards",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("collection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column(
            "definition",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{\"layout_version\": 1, \"global_filters\": []}'::jsonb"),
        ),
        sa.Column("created_by_membership_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("updated_by_membership_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["workspaces.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "workspace_id"],
            ["workspaces.tenant_id", "workspaces.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "collection_id"],
            ["collections.tenant_id", "collections.workspace_id", "collections.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "created_by_membership_id"],
            ["memberships.tenant_id", "memberships.workspace_id", "memberships.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "updated_by_membership_id"],
            ["memberships.tenant_id", "memberships.workspace_id", "memberships.id"],
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("tenant_id", "id", name="uq_dashboards_tenant_id_id"),
        sa.UniqueConstraint(
            "tenant_id",
            "workspace_id",
            "id",
            name="uq_dashboards_tenant_workspace_id",
        ),
    )
    op.create_index("ix_dashboards_tenant_id", "dashboards", ["tenant_id"])
    op.create_index("ix_dashboards_workspace_id", "dashboards", ["workspace_id"])
    op.create_index("ix_dashboards_collection_id", "dashboards", ["collection_id"])
    op.create_index(
        "ix_dashboards_tenant_workspace_collection_deleted_title",
        "dashboards",
        ["tenant_id", "workspace_id", "collection_id", "deleted_at", "title"],
    )
    op.create_index(
        "ix_dashboards_tenant_workspace_deleted_updated",
        "dashboards",
        ["tenant_id", "workspace_id", "deleted_at", "updated_at"],
    )
    op.execute(
        """
        CREATE UNIQUE INDEX uq_dashboards_collection_active_title
        ON dashboards (collection_id, lower(trim(title)))
        WHERE deleted_at IS NULL
        """
    )

    op.create_table(
        "dashboard_widgets",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dashboard_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("saved_question_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("widget_type", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("layout", postgresql.JSONB(), nullable=False),
        sa.Column(
            "config",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "filter_bindings",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "filter_overrides",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["workspaces.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "dashboard_id"],
            ["dashboards.tenant_id", "dashboards.workspace_id", "dashboards.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "saved_question_id"],
            [
                "saved_questions.tenant_id",
                "saved_questions.workspace_id",
                "saved_questions.id",
            ],
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "tenant_id",
            "workspace_id",
            "id",
            name="uq_dashboard_widgets_tenant_workspace_id",
        ),
    )
    op.create_index("ix_dashboard_widgets_tenant_id", "dashboard_widgets", ["tenant_id"])
    op.create_index(
        "ix_dashboard_widgets_workspace_id", "dashboard_widgets", ["workspace_id"]
    )
    op.create_index(
        "ix_dashboard_widgets_dashboard_id", "dashboard_widgets", ["dashboard_id"]
    )
    op.create_index(
        "ix_dashboard_widgets_saved_question_id",
        "dashboard_widgets",
        ["saved_question_id"],
    )
    op.create_index(
        "ix_dashboard_widgets_dashboard_deleted",
        "dashboard_widgets",
        ["dashboard_id", "deleted_at"],
    )
    op.create_index(
        "ix_dashboard_widgets_tenant_workspace_saved_question",
        "dashboard_widgets",
        ["tenant_id", "workspace_id", "saved_question_id"],
    )

    op.create_table(
        "dashboard_grants",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dashboard_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("membership_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("permission", collection_permission, nullable=False),
        sa.Column("created_by_membership_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["workspaces.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "dashboard_id"],
            ["dashboards.tenant_id", "dashboards.workspace_id", "dashboards.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "membership_id"],
            ["memberships.tenant_id", "memberships.workspace_id", "memberships.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "created_by_membership_id"],
            ["memberships.tenant_id", "memberships.workspace_id", "memberships.id"],
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "dashboard_id",
            "membership_id",
            name="uq_dashboard_grants_dashboard_member",
        ),
    )
    op.create_index("ix_dashboard_grants_tenant_id", "dashboard_grants", ["tenant_id"])
    op.create_index(
        "ix_dashboard_grants_workspace_id", "dashboard_grants", ["workspace_id"]
    )
    op.create_index(
        "ix_dashboard_grants_dashboard_id", "dashboard_grants", ["dashboard_id"]
    )
    op.create_index(
        "ix_dashboard_grants_membership_id", "dashboard_grants", ["membership_id"]
    )
    op.create_index(
        "ix_dashboard_grants_tenant_workspace_dashboard",
        "dashboard_grants",
        ["tenant_id", "workspace_id", "dashboard_id"],
    )

    op.create_foreign_key(
        "fk_query_audit_logs_dashboard",
        "query_audit_logs",
        "dashboards",
        ["dashboard_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.add_column(
        "query_audit_logs",
        sa.Column("widget_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_query_audit_logs_widget",
        "query_audit_logs",
        "dashboard_widgets",
        ["widget_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_query_audit_logs_widget", "query_audit_logs", type_="foreignkey"
    )
    op.drop_column("query_audit_logs", "widget_id")
    op.drop_constraint(
        "fk_query_audit_logs_dashboard", "query_audit_logs", type_="foreignkey"
    )
    op.drop_index(
        "ix_dashboard_grants_tenant_workspace_dashboard", table_name="dashboard_grants"
    )
    op.drop_index("ix_dashboard_grants_membership_id", table_name="dashboard_grants")
    op.drop_index("ix_dashboard_grants_dashboard_id", table_name="dashboard_grants")
    op.drop_index("ix_dashboard_grants_workspace_id", table_name="dashboard_grants")
    op.drop_index("ix_dashboard_grants_tenant_id", table_name="dashboard_grants")
    op.drop_table("dashboard_grants")

    op.drop_index(
        "ix_dashboard_widgets_tenant_workspace_saved_question",
        table_name="dashboard_widgets",
    )
    op.drop_index("ix_dashboard_widgets_dashboard_deleted", table_name="dashboard_widgets")
    op.drop_index("ix_dashboard_widgets_saved_question_id", table_name="dashboard_widgets")
    op.drop_index("ix_dashboard_widgets_dashboard_id", table_name="dashboard_widgets")
    op.drop_index("ix_dashboard_widgets_workspace_id", table_name="dashboard_widgets")
    op.drop_index("ix_dashboard_widgets_tenant_id", table_name="dashboard_widgets")
    op.drop_table("dashboard_widgets")

    op.execute("DROP INDEX IF EXISTS uq_dashboards_collection_active_title")
    op.drop_index(
        "ix_dashboards_tenant_workspace_deleted_updated", table_name="dashboards"
    )
    op.drop_index(
        "ix_dashboards_tenant_workspace_collection_deleted_title",
        table_name="dashboards",
    )
    op.drop_index("ix_dashboards_collection_id", table_name="dashboards")
    op.drop_index("ix_dashboards_workspace_id", table_name="dashboards")
    op.drop_index("ix_dashboards_tenant_id", table_name="dashboards")
    op.drop_table("dashboards")
