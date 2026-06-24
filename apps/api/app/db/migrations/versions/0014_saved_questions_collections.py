"""Feature 5: saved questions, collections, question grants, grant enum alignment.

Revision ID: 0014
Revises: 0013
Create Date: 2026-06-02

Downgrade note: ``collection_permission`` enum rollback maps ``view`` -> ``read`` and
``edit`` -> ``write`` only. Re-run forward migration if production data needs the
Feature 5 vocabulary restored after a downgrade.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0014"
down_revision: str | None = "0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()

    collection_permission = postgresql.ENUM(
        "view",
        "edit",
        name="collection_permission",
        create_type=False,
    )

    op.create_table(
        "collections",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_by_membership_id", postgresql.UUID(as_uuid=True), nullable=False),
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
            ["tenant_id", "workspace_id", "created_by_membership_id"],
            ["memberships.tenant_id", "memberships.workspace_id", "memberships.id"],
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("tenant_id", "id", name="uq_collections_tenant_id_id"),
        sa.UniqueConstraint(
            "tenant_id",
            "workspace_id",
            "id",
            name="uq_collections_tenant_workspace_id",
        ),
    )
    op.create_index("ix_collections_tenant_id", "collections", ["tenant_id"])
    op.create_index("ix_collections_workspace_id", "collections", ["workspace_id"])
    op.create_index(
        "ix_collections_tenant_workspace_deleted_sort_name",
        "collections",
        ["tenant_id", "workspace_id", "deleted_at", "sort_order", "name"],
    )
    op.execute(
        """
        CREATE UNIQUE INDEX uq_collections_workspace_active_name
        ON collections (workspace_id, lower(trim(name)))
        WHERE deleted_at IS NULL
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX uq_collections_workspace_active_slug
        ON collections (workspace_id, slug)
        WHERE deleted_at IS NULL
        """
    )

    op.create_table(
        "saved_questions",
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
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sql_text", sa.Text(), nullable=False),
        sa.Column(
            "parameter_schema",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
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
        sa.UniqueConstraint(
            "tenant_id",
            "workspace_id",
            "id",
            name="uq_saved_questions_tenant_workspace_id",
        ),
    )
    op.create_index("ix_saved_questions_tenant_id", "saved_questions", ["tenant_id"])
    op.create_index(
        "ix_saved_questions_workspace_id", "saved_questions", ["workspace_id"]
    )
    op.create_index(
        "ix_saved_questions_collection_id", "saved_questions", ["collection_id"]
    )
    op.create_index(
        "ix_saved_questions_tenant_workspace_collection_deleted_title",
        "saved_questions",
        ["tenant_id", "workspace_id", "collection_id", "deleted_at", "title"],
    )
    op.create_index(
        "ix_saved_questions_tenant_workspace_deleted_updated",
        "saved_questions",
        ["tenant_id", "workspace_id", "deleted_at", "updated_at"],
    )

    op.create_foreign_key(
        "fk_collection_grants_collection",
        "collection_grants",
        "collections",
        ["tenant_id", "workspace_id", "collection_id"],
        ["tenant_id", "workspace_id", "id"],
        ondelete="CASCADE",
    )

    op.execute("ALTER TYPE collection_permission RENAME TO collection_permission_old")
    collection_permission.create(bind, checkfirst=True)
    op.execute(
        """
        ALTER TABLE collection_grants
        ALTER COLUMN permission TYPE collection_permission
        USING (
            CASE permission::text
                WHEN 'read' THEN 'view'::collection_permission
                WHEN 'write' THEN 'edit'::collection_permission
                WHEN 'admin' THEN 'edit'::collection_permission
            END
        )
        """
    )
    op.execute("DROP TYPE collection_permission_old")

    op.create_table(
        "question_grants",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("saved_question_id", postgresql.UUID(as_uuid=True), nullable=False),
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
            ["tenant_id", "workspace_id", "saved_question_id"],
            [
                "saved_questions.tenant_id",
                "saved_questions.workspace_id",
                "saved_questions.id",
            ],
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
            "saved_question_id",
            "membership_id",
            name="uq_question_grants_question_member",
        ),
    )
    op.create_index("ix_question_grants_tenant_id", "question_grants", ["tenant_id"])
    op.create_index(
        "ix_question_grants_workspace_id", "question_grants", ["workspace_id"]
    )
    op.create_index(
        "ix_question_grants_saved_question_id",
        "question_grants",
        ["saved_question_id"],
    )
    op.create_index(
        "ix_question_grants_membership_id", "question_grants", ["membership_id"]
    )
    op.create_index(
        "ix_question_grants_tenant_workspace_question",
        "question_grants",
        ["tenant_id", "workspace_id", "saved_question_id"],
    )

    op.create_foreign_key(
        "fk_query_audit_logs_saved_question",
        "query_audit_logs",
        "saved_questions",
        ["saved_question_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_query_audit_logs_saved_question", "query_audit_logs", type_="foreignkey"
    )

    op.drop_index(
        "ix_question_grants_tenant_workspace_question", table_name="question_grants"
    )
    op.drop_index("ix_question_grants_membership_id", table_name="question_grants")
    op.drop_index(
        "ix_question_grants_saved_question_id", table_name="question_grants"
    )
    op.drop_index("ix_question_grants_workspace_id", table_name="question_grants")
    op.drop_index("ix_question_grants_tenant_id", table_name="question_grants")
    op.drop_table("question_grants")

    op.execute("ALTER TYPE collection_permission RENAME TO collection_permission_new")
    old_permission = postgresql.ENUM(
        "read",
        "write",
        "admin",
        name="collection_permission",
        create_type=False,
    )
    bind = op.get_bind()
    old_permission.create(bind, checkfirst=True)
    op.execute(
        """
        ALTER TABLE collection_grants
        ALTER COLUMN permission TYPE collection_permission
        USING (
            CASE permission::text
                WHEN 'view' THEN 'read'::collection_permission
                WHEN 'edit' THEN 'write'::collection_permission
            END
        )
        """
    )
    op.execute("DROP TYPE collection_permission_new")

    op.drop_constraint(
        "fk_collection_grants_collection", "collection_grants", type_="foreignkey"
    )

    op.drop_index(
        "ix_saved_questions_tenant_workspace_deleted_updated",
        table_name="saved_questions",
    )
    op.drop_index(
        "ix_saved_questions_tenant_workspace_collection_deleted_title",
        table_name="saved_questions",
    )
    op.drop_index("ix_saved_questions_collection_id", table_name="saved_questions")
    op.drop_index("ix_saved_questions_workspace_id", table_name="saved_questions")
    op.drop_index("ix_saved_questions_tenant_id", table_name="saved_questions")
    op.drop_table("saved_questions")

    op.execute("DROP INDEX IF EXISTS uq_collections_workspace_active_slug")
    op.execute("DROP INDEX IF EXISTS uq_collections_workspace_active_name")
    op.drop_index(
        "ix_collections_tenant_workspace_deleted_sort_name", table_name="collections"
    )
    op.drop_index("ix_collections_workspace_id", table_name="collections")
    op.drop_index("ix_collections_tenant_id", table_name="collections")
    op.drop_table("collections")
