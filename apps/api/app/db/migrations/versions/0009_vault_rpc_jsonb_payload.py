"""Vault RPC wrappers: single jsonb argument for PostgREST compatibility.

Revision ID: 0009
Revises: 0008
Create Date: 2026-05-08

Multi-argument RPC calls to Supabase still returned 400 for some projects.
PostgREST maps JSON object keys to parameter names; a single `payload jsonb`
argument avoids ambiguity and matches the documented json/jsonb RPC pattern.

Replaces:
  dashboardy_vault_create_secret(text, text, text)
  dashboardy_vault_read_secret_text(uuid)
with:
  dashboardy_vault_create_secret(jsonb)
  dashboardy_vault_read_secret_text(jsonb)

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_VAULT_CREATE_JSONB = """
CREATE FUNCTION public.dashboardy_vault_create_secret(payload jsonb)
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

_VAULT_READ_JSONB = """
CREATE FUNCTION public.dashboardy_vault_read_secret_text(payload jsonb)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = vault, pg_temp
STABLE
AS $$
    SELECT decrypted_secret
    FROM vault.decrypted_secrets
    WHERE id = (payload->>'p_secret_id')::uuid
    LIMIT 1;
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


def _has_vault_decrypted_secrets(bind: object) -> bool:
    return bool(
        bind.execute(
            sa.text(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'vault'
                      AND c.relname = 'decrypted_secrets'
                      AND c.relkind IN ('v', 'm')
                )
                """
            )
        ).scalar()
    )


def _grant_service_role_execute(bind: object) -> bool:
    return bool(
        bind.execute(
            sa.text("SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')")
        ).scalar()
    )


def upgrade() -> None:
    bind = op.get_bind()

    if _has_vault_create_secret(bind):
        op.execute(
            "DROP FUNCTION IF EXISTS public.dashboardy_vault_create_secret(text, text, text);"
        )
        op.execute(
            "DROP FUNCTION IF EXISTS public.dashboardy_vault_create_secret(jsonb);"
        )
        op.execute(_VAULT_CREATE_JSONB)
        op.execute(
            """
            REVOKE ALL ON FUNCTION public.dashboardy_vault_create_secret(jsonb)
                FROM PUBLIC;
            """
        )
        if _grant_service_role_execute(bind):
            op.execute(
                """
                GRANT EXECUTE ON FUNCTION public.dashboardy_vault_create_secret(jsonb)
                    TO service_role;
                """
            )

    if _has_vault_decrypted_secrets(bind):
        op.execute(
            "DROP FUNCTION IF EXISTS public.dashboardy_vault_read_secret_text(uuid);"
        )
        op.execute(
            "DROP FUNCTION IF EXISTS public.dashboardy_vault_read_secret_text(jsonb);"
        )
        op.execute(_VAULT_READ_JSONB)
        op.execute(
            """
            REVOKE ALL ON FUNCTION public.dashboardy_vault_read_secret_text(jsonb)
                FROM PUBLIC;
            """
        )
        if _grant_service_role_execute(bind):
            op.execute(
                """
                GRANT EXECUTE ON FUNCTION public.dashboardy_vault_read_secret_text(jsonb)
                    TO service_role;
                """
            )


def downgrade() -> None:
    op.execute(
        "DROP FUNCTION IF EXISTS public.dashboardy_vault_read_secret_text(jsonb);"
    )
    op.execute(
        "DROP FUNCTION IF EXISTS public.dashboardy_vault_create_secret(jsonb);"
    )
