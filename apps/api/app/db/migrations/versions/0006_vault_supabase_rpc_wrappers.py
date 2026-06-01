"""Public RPC wrappers for Supabase Vault (service_role only).

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-08

PostgREST returns 406 when targeting the `vault` schema if that schema is not
listed under API exposed schemas. These wrappers live in `public` and delegate
to `vault.*` with SECURITY DEFINER so the dashboardy API can call:

  POST /rest/v1/rpc/dashboardy_vault_create_secret
  POST /rest/v1/rpc/dashboardy_vault_read_secret_text

without exposing the vault schema to the Data API.

When Vault is not installed (e.g. vanilla Postgres in local tests), this
migration is a no-op.

The create- and read-back wrappers are applied independently: the create RPC must
exist whenever `vault.create_secret` does, even if visibility checks on
`vault.decrypted_secrets` fail (older migration logic wrongly skipped both).

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# asyncpg (SQLAlchemy async) rejects multiple statements in one execute(); split DROP/CREATE.
_VAULT_CREATE = """
CREATE FUNCTION public.dashboardy_vault_create_secret(
    p_secret text,
    p_name text DEFAULT NULL,
    p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = vault, pg_temp
AS $$
    SELECT vault.create_secret(p_secret, p_name, p_description);
$$;
"""

_VAULT_READ = """
CREATE FUNCTION public.dashboardy_vault_read_secret_text(p_secret_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = vault, pg_temp
STABLE
AS $$
    SELECT decrypted_secret
    FROM vault.decrypted_secrets
    WHERE id = p_secret_id
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
            sa.text(
                "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')"
            )
        ).scalar()
    )


def upgrade() -> None:
    bind = op.get_bind()
    if _has_vault_create_secret(bind):
        op.execute(
            "DROP FUNCTION IF EXISTS public.dashboardy_vault_create_secret(text, text, text);"
        )
        op.execute(_VAULT_CREATE)
        op.execute(
            """
            REVOKE ALL ON FUNCTION public.dashboardy_vault_create_secret(text, text, text)
                FROM PUBLIC;
            """
        )
        if _grant_service_role_execute(bind):
            op.execute(
                """
                GRANT EXECUTE ON FUNCTION public.dashboardy_vault_create_secret(text, text, text)
                    TO service_role;
                """
            )

    if _has_vault_decrypted_secrets(bind):
        op.execute(
            "DROP FUNCTION IF EXISTS public.dashboardy_vault_read_secret_text(uuid);"
        )
        op.execute(_VAULT_READ)
        op.execute(
            """
            REVOKE ALL ON FUNCTION public.dashboardy_vault_read_secret_text(uuid)
                FROM PUBLIC;
            """
        )
        if _grant_service_role_execute(bind):
            op.execute(
                """
                GRANT EXECUTE ON FUNCTION public.dashboardy_vault_read_secret_text(uuid)
                    TO service_role;
                """
            )


def downgrade() -> None:
    op.execute(
        "DROP FUNCTION IF EXISTS public.dashboardy_vault_read_secret_text(uuid);"
    )
    op.execute(
        "DROP FUNCTION IF EXISTS public.dashboardy_vault_create_secret(text, text, text);"
    )
