"""Re-apply Vault RPC wrappers when revision 0006 did not create them.

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-08

Earlier 0006 required both `vault.create_secret` and `decrypted_secrets` to be
visible in a single check; some environments skipped both while still recording
revision 0006, which led to PostgREST 404 on `dashboardy_vault_create_secret`.

This revision repeats the same idempotent CREATE OR REPLACE steps as the fixed
0006 upgrade (independent create vs read, pg_class for the decrypted view).

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
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
            sa.text("SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')")
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
