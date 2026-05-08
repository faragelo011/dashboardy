"""Vault create wrapper: description text must not be SQL NULL for create_secret.

Revision ID: 0011
Revises: 0010
Create Date: 2026-05-08

`vault.create_secret` default for `new_description` is only used when the
argument is omitted. Passing NULL (e.g. from `NULLIF(btrim(NULL), '')`) still
supplies NULL and violates `vault.secrets.description NOT NULL`.

Use `COALESCE(btrim(payload->>'p_description'), '')` so missing or all-blank
descriptions become `''`, not NULL.

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_FIX = """
CREATE OR REPLACE FUNCTION public.dashboardy_vault_create_secret(payload jsonb)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = vault, pg_temp
AS $$
    SELECT vault.create_secret(
        payload->>'p_secret',
        NULLIF(btrim(payload->>'p_name'), ''),
        COALESCE(btrim(payload->>'p_description'), '')
    );
$$;
"""

_PREV = """
CREATE OR REPLACE FUNCTION public.dashboardy_vault_create_secret(payload jsonb)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = vault, pg_temp
AS $$
    SELECT vault.create_secret(
        payload->>'p_secret',
        NULLIF(btrim(payload->>'p_name'), ''),
        COALESCE(NULLIF(btrim(payload->>'p_description'), ''), '')
    );
$$;
"""


def _has_vault_create_secret(bind: object) -> bool:
    return bool(
        bind.execute(
            sa.text(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_proc p
                    JOIN pg_namespace n ON n.oid = p.pronamespace
                    WHERE n.nspname = 'vault'
                      AND p.proname = 'create_secret'
                )
                """
            )
        ).scalar()
    )


def upgrade() -> None:
    bind = op.get_bind()
    if not _has_vault_create_secret(bind):
        return
    op.execute(_FIX)


def downgrade() -> None:
    bind = op.get_bind()
    if not _has_vault_create_secret(bind):
        return
    op.execute(_PREV)
