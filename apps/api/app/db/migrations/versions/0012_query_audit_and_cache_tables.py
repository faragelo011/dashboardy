"""Feature 4: query audit logs + cache_entries (Query Engine persistence).

Revision ID: 0012
Revises: 0011
Create Date: 2026-05-08

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0012"
down_revision: str | None = "0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()

    query_execution_status = postgresql.ENUM(
        "ok",
        "timeout",
        "row_limit_exceeded",
        "rejected_by_parser",
        "warehouse_error",
        "authz_denied",
        "warehouse_busy",
        name="query_execution_status",
        create_type=False,
    )
    cache_presentation_class = postgresql.ENUM(
        "kpi",
        "chart",
        "table",
        name="cache_presentation_class",
        create_type=False,
    )

    query_execution_status.create(bind, checkfirst=True)
    cache_presentation_class.create(bind, checkfirst=True)

    op.create_table(
        "query_audit_logs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("saved_question_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("dashboard_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("sql_hash", sa.CHAR(length=64), nullable=False),
        sa.Column("bound_parameters_hash", sa.CHAR(length=64), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=False),
        sa.Column("bytes_scanned", sa.BigInteger(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=False),
        sa.Column("cache_hit", sa.Boolean(), nullable=False),
        sa.Column("status", query_execution_status, nullable=False),
        sa.Column("error_code", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["tenant_id", "workspace_id"],
            ["workspaces.tenant_id", "workspaces.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "connection_id"],
            ["data_connections.tenant_id", "data_connections.id"],
            ondelete="CASCADE",
        ),
    )

    op.create_index(
        "ix_query_audit_logs_tenant_created_at",
        "query_audit_logs",
        ["tenant_id", "created_at"],
        postgresql_ops={"created_at": "DESC"},
    )
    op.create_index(
        "ix_query_audit_logs_connection_created_at",
        "query_audit_logs",
        ["connection_id", "created_at"],
        postgresql_ops={"created_at": "DESC"},
    )

    op.create_table(
        "cache_entries",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("secret_version", sa.Integer(), nullable=False),
        sa.Column("cache_key", sa.String(length=128), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "presentation_class", cache_presentation_class, nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["tenant_id", "connection_id"],
            ["data_connections.tenant_id", "data_connections.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "tenant_id",
            "cache_key",
            name="uq_cache_entries_tenant_cache_key",
        ),
    )
    op.create_index("ix_cache_entries_expires_at", "cache_entries", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_cache_entries_expires_at", table_name="cache_entries")
    op.drop_table("cache_entries")

    op.drop_index(
        "ix_query_audit_logs_connection_created_at", table_name="query_audit_logs"
    )
    op.drop_index(
        "ix_query_audit_logs_tenant_created_at", table_name="query_audit_logs"
    )
    op.drop_table("query_audit_logs")

    bind = op.get_bind()
    cache_presentation_class = postgresql.ENUM(
        name="cache_presentation_class",
    )
    query_execution_status = postgresql.ENUM(
        name="query_execution_status",
    )
    cache_presentation_class.drop(bind, checkfirst=True)
    query_execution_status.drop(bind, checkfirst=True)
