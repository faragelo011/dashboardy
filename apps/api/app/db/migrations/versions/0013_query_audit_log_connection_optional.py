"""Allow null connection_id when audit records pre-connection failures (US1).

Revision ID: 0013
Revises: 0012
Create Date: 2026-05-08

PostgreSQL skips FK validation when referencing columns contain NULL composite parts.
"""

from collections.abc import Sequence

from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "query_audit_logs",
        "connection_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "query_audit_logs",
        "connection_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
