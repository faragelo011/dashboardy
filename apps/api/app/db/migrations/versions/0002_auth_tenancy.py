"""Feature 2: auth + tenancy metadata tables.

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-27

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    membership_role = postgresql.ENUM(
        "admin",
        "analyst",
        "viewer",
        "external_client",
        name="membership_role",
        create_type=False,
    )
    membership_status = postgresql.ENUM(
        "active",
        "inactive",
        name="membership_status",
        create_type=False,
    )
    collection_permission = postgresql.ENUM(
        "read",
        "write",
        "admin",
        name="collection_permission",
        create_type=False,
    )
    asset_type = postgresql.ENUM(
        "question",
        "dashboard",
        name="asset_type",
        create_type=False,
    )

    bind = op.get_bind()
    membership_role.create(bind, checkfirst=True)
    membership_status.create(bind, checkfirst=True)
    collection_permission.create(bind, checkfirst=True)
    asset_type.create(bind, checkfirst=True)

    op.create_table(
        "tenants",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.Text(), nullable=False),
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
    )

    op.create_table(
        "workspaces",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
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
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("tenant_id", name="uq_workspaces_one_per_tenant"),
        sa.UniqueConstraint("tenant_id", "id", name="uq_workspaces_tenant_id_id"),
        sa.UniqueConstraint("tenant_id", "slug", name="uq_workspaces_tenant_slug"),
    )
    op.create_index("ix_workspaces_tenant_id", "workspaces", ["tenant_id"])

    op.create_table(
        "memberships",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", membership_role, nullable=False),
        sa.Column(
            "status",
            membership_status,
            nullable=False,
            server_default=sa.text("'active'::membership_status"),
        ),
        sa.Column("invited_email", sa.Text(), nullable=True),
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
        sa.Column("deactivated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["tenant_id", "workspace_id"],
            ["workspaces.tenant_id", "workspaces.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "user_id", "workspace_id", name="uq_memberships_user_workspace"
        ),
        sa.UniqueConstraint(
            "tenant_id",
            "workspace_id",
            "id",
            name="uq_memberships_tenant_workspace_id",
        ),
    )
    op.create_index("ix_memberships_tenant_id", "memberships", ["tenant_id"])
    op.create_index("ix_memberships_workspace_id", "memberships", ["workspace_id"])
    op.create_index("ix_memberships_user_id", "memberships", ["user_id"])
    op.create_index(
        "ix_memberships_tenant_workspace_user",
        "memberships",
        ["tenant_id", "workspace_id", "user_id"],
    )
    op.create_index("ix_memberships_user_status", "memberships", ["user_id", "status"])

    op.create_table(
        "collection_grants",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("collection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("membership_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("permission", collection_permission, nullable=False),
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
            ["tenant_id", "workspace_id", "membership_id"],
            ["memberships.tenant_id", "memberships.workspace_id", "memberships.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "collection_id",
            "membership_id",
            name="uq_collection_grants_collection_member",
        ),
    )
    op.create_index(
        "ix_collection_grants_tenant_id", "collection_grants", ["tenant_id"]
    )
    op.create_index(
        "ix_collection_grants_workspace_id", "collection_grants", ["workspace_id"]
    )
    op.create_index(
        "ix_collection_grants_collection_id", "collection_grants", ["collection_id"]
    )
    op.create_index(
        "ix_collection_grants_membership_id", "collection_grants", ["membership_id"]
    )
    op.create_index(
        "ix_collection_grants_tenant_workspace_collection",
        "collection_grants",
        ["tenant_id", "workspace_id", "collection_id"],
    )

    op.create_table(
        "asset_grants",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asset_type", asset_type, nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "can_export",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "created_by_membership_id", postgresql.UUID(as_uuid=True), nullable=False
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
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["workspaces.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "workspace_id", "created_by_membership_id"],
            ["memberships.tenant_id", "memberships.workspace_id", "memberships.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "workspace_id",
            "user_id",
            "asset_type",
            "asset_id",
            name="uq_asset_grants_workspace_user_asset",
        ),
    )
    op.create_index("ix_asset_grants_tenant_id", "asset_grants", ["tenant_id"])
    op.create_index("ix_asset_grants_workspace_id", "asset_grants", ["workspace_id"])
    op.create_index("ix_asset_grants_user_id", "asset_grants", ["user_id"])
    op.create_index(
        "ix_asset_grants_tenant_workspace_user_asset",
        "asset_grants",
        ["tenant_id", "workspace_id", "user_id", "asset_type", "asset_id"],
    )


def downgrade() -> None:
    op.drop_table("asset_grants")
    op.drop_table("collection_grants")
    op.drop_table("memberships")
    op.drop_table("workspaces")
    op.drop_table("tenants")

    op.execute("DROP TYPE IF EXISTS asset_type CASCADE")
    op.execute("DROP TYPE IF EXISTS collection_permission CASCADE")
    op.execute("DROP TYPE IF EXISTS membership_status CASCADE")
    op.execute("DROP TYPE IF EXISTS membership_role CASCADE")
