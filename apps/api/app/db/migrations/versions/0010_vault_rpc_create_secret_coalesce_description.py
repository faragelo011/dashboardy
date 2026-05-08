"""Vault create wrapper: never pass NULL description (NOT NULL column).

Revision ID: 0010
Revises: 0009
Create Date: 2026-05-08

Omitted `p_description` produced NULL for `vault.create_secret` arg 3; newer
`vault.secrets.description` is NOT NULL, so PostgREST returned 400 and the API
retried legacy signatures (404).

When the `vault` schema is absent (e.g. vanilla local Postgres), this revision
is a no-op — same pattern as 0006–0009.

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_FIX_CREATE = """
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

_OLD_CREATE = """
CREATE OR REPLACE FUNCTION public.dashboardy_vault_create_secret(payload jsonb)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = vault, pg_temp
AS $$
    SELECT vault.create_secret(
        payload->>'p_secret',
        NULLIF(btrim(payload->>'p_name'), ''),
        NULLIF(btrim(payload->>'p_description'), '')
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
    op.execute(_FIX_CREATE)


def downgrade() -> None:
    bind = op.get_bind()
    if not _has_vault_create_secret(bind):
        return
    op.execute(_OLD_CREATE)
