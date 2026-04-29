"""Feature 3: data connections, test results, and management audit tables.

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-30

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    connection_status = postgresql.ENUM(
        "not_configured",
        "pending_test",
        "active",
        "test_failed",
        name="connection_status",
        create_type=False,
    )
    connection_test_status = postgresql.ENUM(
        "success",
        "failure",
        name="connection_test_status",
        create_type=False,
    )
    connection_failure_category = postgresql.ENUM(
        "credential",
        "network",
        "permission",
        "timeout",
        "unknown",
        name="connection_failure_category",
        create_type=False,
    )
    connection_audit_action = postgresql.ENUM(
        "create",
        "metadata_update",
        "test",
        "rotate",
        name="connection_audit_action",
        create_type=False,
    )
    connection_audit_outcome = postgresql.ENUM(
        "success",
        "failure",
        name="connection_audit_outcome",
        create_type=False,
    )

    bind = op.get_bind()
    connection_status.create(bind, checkfirst=True)
    connection_test_status.create(bind, checkfirst=True)
    connection_failure_category.create(bind, checkfirst=True)
    connection_audit_action.create(bind, checkfirst=True)
    connection_audit_outcome.create(bind, checkfirst=True)

    op.create_unique_constraint(
        "uq_memberships_tenant_id_id",
        "memberships",
        ["tenant_id", "id"],
    )

    op.create_table(
        "data_connections",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("vault_secret_id", sa.Text(), nullable=True),
        sa.Column(
            "secret_version",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("pending_vault_secret_id", sa.Text(), nullable=True),
        sa.Column("pending_secret_version", sa.Integer(), nullable=True),
        sa.Column("warehouse", sa.Text(), nullable=False),
        sa.Column("database", sa.Text(), nullable=False),
        sa.Column("schema", sa.Text(), nullable=True),
        sa.Column(
            "status",
            connection_status,
            nullable=False,
            server_default=sa.text("'not_configured'::connection_status"),
        ),
        sa.Column("last_tested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_successful_test_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["tenant_id", "created_by_membership_id"],
            ["memberships.tenant_id", "memberships.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "updated_by_membership_id"],
            ["memberships.tenant_id", "memberships.id"],
            ondelete="SET NULL",
        ),
        sa.UniqueConstraint("tenant_id", name="uq_data_connections_tenant_id"),
        sa.UniqueConstraint("tenant_id", "id", name="uq_data_connections_tenant_id_id"),
    )
    op.create_index("ix_data_connections_tenant_id", "data_connections", ["tenant_id"])

    op.create_table(
        "connection_test_results",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "attempted_by_membership_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("credential_version", sa.Integer(), nullable=False),
        sa.Column("status", connection_test_status, nullable=False),
        sa.Column("failure_category", connection_failure_category, nullable=True),
        sa.Column("sanitized_error", sa.Text(), nullable=True),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "completed_at",
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
        sa.ForeignKeyConstraint(
            ["tenant_id", "attempted_by_membership_id"],
            ["memberships.tenant_id", "memberships.id"],
            ondelete="RESTRICT",
        ),
    )
    op.create_index(
        "ix_connection_test_results_tenant_connection_completed",
        "connection_test_results",
        ["tenant_id", "connection_id", "completed_at"],
    )

    op.create_table(
        "connection_management_audit_records",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_membership_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action", connection_audit_action, nullable=False),
        sa.Column("outcome", connection_audit_outcome, nullable=False),
        sa.Column("failure_category", connection_failure_category, nullable=True),
        sa.Column("sanitized_message", sa.Text(), nullable=True),
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
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "actor_membership_id"],
            ["memberships.tenant_id", "memberships.id"],
            ondelete="RESTRICT",
        ),
    )
    op.create_index(
        "ix_connection_mgmt_audit_tenant_connection_created",
        "connection_management_audit_records",
        ["tenant_id", "connection_id", "created_at"],
    )
    op.create_index(
        "ix_connection_mgmt_audit_tenant_actor_created",
        "connection_management_audit_records",
        ["tenant_id", "actor_membership_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_connection_mgmt_audit_tenant_actor_created",
        table_name="connection_management_audit_records",
    )
    op.drop_index(
        "ix_connection_mgmt_audit_tenant_connection_created",
        table_name="connection_management_audit_records",
    )
    op.drop_table("connection_management_audit_records")

    op.drop_index(
        "ix_connection_test_results_tenant_connection_completed",
        table_name="connection_test_results",
    )
    op.drop_table("connection_test_results")

    op.drop_index("ix_data_connections_tenant_id", table_name="data_connections")
    op.drop_table("data_connections")

    op.drop_constraint(
        "uq_memberships_tenant_id_id",
        "memberships",
        type_="unique",
    )

    connection_audit_outcome = postgresql.ENUM(name="connection_audit_outcome")
    connection_audit_action = postgresql.ENUM(name="connection_audit_action")
    connection_failure_category = postgresql.ENUM(name="connection_failure_category")
    connection_test_status = postgresql.ENUM(name="connection_test_status")
    connection_status = postgresql.ENUM(name="connection_status")

    bind = op.get_bind()
    connection_audit_outcome.drop(bind, checkfirst=True)
    connection_audit_action.drop(bind, checkfirst=True)
    connection_failure_category.drop(bind, checkfirst=True)
    connection_test_status.drop(bind, checkfirst=True)
    connection_status.drop(bind, checkfirst=True)
