"""Fix audit composite FK: SET NULL is invalid when tenant_id is NOT NULL.

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-30

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_NEW_FK_NAME = "fk_connection_audit_data_connection"


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    target = None
    for fk in insp.get_foreign_keys("connection_management_audit_records"):
        if fk["referred_table"] != "data_connections":
            continue
        if tuple(fk["constrained_columns"]) != ("tenant_id", "connection_id"):
            continue
        target = fk
        break
    if target is None:
        return
    if str(target.get("options", {}).get("ondelete") or "").upper() == "CASCADE":
        return
    op.drop_constraint(
        target["name"],
        "connection_management_audit_records",
        type_="foreignkey",
    )
    op.create_foreign_key(
        _NEW_FK_NAME,
        "connection_management_audit_records",
        "data_connections",
        ["tenant_id", "connection_id"],
        ["tenant_id", "id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    names = {
        fk["name"]
        for fk in insp.get_foreign_keys("connection_management_audit_records")
        if fk["referred_table"] == "data_connections"
        and tuple(fk["constrained_columns"]) == ("tenant_id", "connection_id")
    }
    if _NEW_FK_NAME not in names:
        return
    op.drop_constraint(
        _NEW_FK_NAME,
        "connection_management_audit_records",
        type_="foreignkey",
    )
    op.create_foreign_key(
        None,
        "connection_management_audit_records",
        "data_connections",
        ["tenant_id", "connection_id"],
        ["tenant_id", "id"],
        ondelete="CASCADE",
    )
