"""Align data_connections updated_by composite FK with non-null tenant_id.

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-30

SET NULL on (tenant_id, updated_by_membership_id) is invalid when tenant_id
is NOT NULL. Use RESTRICT to match the corrected 0003 definition. Downgrade
recreates the same composite FK with RESTRICT (not SET NULL).

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_NEW_FK_NAME = "fk_data_connections_updated_by_membership"


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    target = None
    for fk in insp.get_foreign_keys("data_connections"):
        if fk["referred_table"] != "memberships":
            continue
        if tuple(fk["constrained_columns"]) != (
            "tenant_id",
            "updated_by_membership_id",
        ):
            continue
        target = fk
        break
    if target is None:
        return
    if str(target.get("options", {}).get("ondelete") or "").upper() == "RESTRICT":
        return
    op.drop_constraint(target["name"], "data_connections", type_="foreignkey")
    op.create_foreign_key(
        _NEW_FK_NAME,
        "data_connections",
        "memberships",
        ["tenant_id", "updated_by_membership_id"],
        ["tenant_id", "id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    names = {
        fk["name"]
        for fk in insp.get_foreign_keys("data_connections")
        if fk["referred_table"] == "memberships"
        and tuple(fk["constrained_columns"])
        == ("tenant_id", "updated_by_membership_id")
    }
    if _NEW_FK_NAME not in names:
        return
    op.drop_constraint(_NEW_FK_NAME, "data_connections", type_="foreignkey")
    op.create_foreign_key(
        None,
        "data_connections",
        "memberships",
        ["tenant_id", "updated_by_membership_id"],
        ["tenant_id", "id"],
        ondelete="RESTRICT",
    )
