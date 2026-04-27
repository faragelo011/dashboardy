"""Assert Feature 2 migration creates expected tables, enums, indexes, and uniques."""

from __future__ import annotations

import asyncio
import os
import subprocess
from pathlib import Path

import asyncpg
from testcontainers.postgres import PostgresContainer

from tests.docker_util import skip_if_no_docker


def _to_asyncpg_database_url(sync_url: str) -> str:
    if sync_url.startswith("postgresql+asyncpg://"):
        return sync_url
    if sync_url.startswith("postgresql+psycopg2://"):
        return sync_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
    if sync_url.startswith("postgresql://"):
        return sync_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if sync_url.startswith("postgres://"):
        return sync_url.replace("postgres://", "postgresql+asyncpg://", 1)
    raise ValueError(f"Unexpected postgres url: {sync_url}")


def _to_asyncpg_dsn(sync_url: str) -> str:
    if sync_url.startswith("postgresql+psycopg2://"):
        return sync_url.replace("postgresql+psycopg2://", "postgresql://", 1)
    if sync_url.startswith("postgresql+asyncpg://"):
        return sync_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    return sync_url


def _format_subprocess_result(
    result: subprocess.CompletedProcess[str],
    label: str,
) -> str:
    return (
        f"{label} failed (exit={result.returncode})\n"
        f"--- stdout ---\n{result.stdout}\n"
        f"--- stderr ---\n{result.stderr}\n"
    )


def test_auth_tenancy_migration_schema():
    skip_if_no_docker()
    api_dir = Path(__file__).resolve().parents[1]

    with PostgresContainer("postgres:16-alpine") as pg:
        sync_url = pg.get_connection_url()
        asyncpg_url = _to_asyncpg_database_url(sync_url)
        dsn = _to_asyncpg_dsn(sync_url)

        env = os.environ.copy()
        env["DATABASE_URL"] = asyncpg_url
        env["SUPABASE_JWKS_URL"] = "https://example.invalid/.well-known/jwks.json"
        env["SUPABASE_JWT_ISSUER"] = "https://example.invalid/auth/v1"

        r = subprocess.run(
            ["uv", "run", "alembic", "upgrade", "head"],
            cwd=api_dir,
            env=env,
            capture_output=True,
            text=True,
            timeout=120,
        )
        assert r.returncode == 0, _format_subprocess_result(r, "alembic upgrade head")

        async def verify() -> None:
            conn = await asyncpg.connect(dsn)
            try:
                tables = {
                    row["table_name"]
                    for row in await conn.fetch(
                        """
                        SELECT table_name
                        FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                        """
                    )
                }
                expected_tables = {
                    "tenants",
                    "workspaces",
                    "memberships",
                    "collection_grants",
                    "asset_grants",
                    "alembic_version",
                }
                assert expected_tables <= tables

                enum_types = {
                    row["typname"]
                    for row in await conn.fetch(
                        """
                        SELECT typname FROM pg_type
                        WHERE typname IN (
                            'membership_role',
                            'membership_status',
                            'collection_permission',
                            'asset_type'
                        )
                        """
                    )
                }
                assert enum_types == {
                    "membership_role",
                    "membership_status",
                    "collection_permission",
                    "asset_type",
                }

                roles = [
                    row["enumlabel"]
                    for row in await conn.fetch(
                        """
                        SELECT e.enumlabel
                        FROM pg_enum e
                        JOIN pg_type t ON e.enumtypid = t.oid
                        WHERE t.typname = 'membership_role'
                        ORDER BY e.enumsortorder
                        """
                    )
                ]
                assert roles == ["admin", "analyst", "viewer", "external_client"]

                async def unique_names(table: str) -> set[str]:
                    rows = await conn.fetch(
                        """
                        SELECT c.conname
                        FROM pg_constraint c
                        JOIN pg_class rel ON rel.oid = c.conrelid
                        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                        WHERE nsp.nspname = 'public'
                          AND rel.relname = $1
                          AND c.contype = 'u'
                        """,
                        table,
                    )
                    return {r["conname"] for r in rows}

                ws_uq = await unique_names("workspaces")
                assert "uq_workspaces_one_per_tenant" in ws_uq
                assert "uq_workspaces_tenant_slug" in ws_uq
                mem_uq = await unique_names("memberships")
                assert "uq_memberships_user_workspace" in mem_uq
                cg_uq = await unique_names("collection_grants")
                assert "uq_collection_grants_collection_member" in cg_uq
                ag_uq = await unique_names("asset_grants")
                assert "uq_asset_grants_workspace_user_asset" in ag_uq

                async def index_names(table: str) -> set[str]:
                    rows = await conn.fetch(
                        """
                        SELECT indexname FROM pg_indexes
                        WHERE schemaname = 'public' AND tablename = $1
                        """,
                        table,
                    )
                    return {r["indexname"] for r in rows}

                m_idx = await index_names("memberships")
                assert "ix_memberships_tenant_workspace_user" in m_idx
                assert "ix_memberships_user_status" in m_idx

                cg_idx = await index_names("collection_grants")
                assert "ix_collection_grants_tenant_workspace_collection" in cg_idx

                ag_idx = await index_names("asset_grants")
                assert "ix_asset_grants_tenant_workspace_user_asset" in ag_idx
            finally:
                await conn.close()

        asyncio.run(verify())
