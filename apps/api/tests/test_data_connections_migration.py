"""Assert Feature 3 migration creates expected tables, enums, indexes, and uniques."""

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


def test_data_connections_migration_schema():
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
                assert {
                    "data_connections",
                    "connection_test_results",
                    "connection_management_audit_records",
                } <= tables

                enum_types = {
                    row["typname"]
                    for row in await conn.fetch(
                        """
                        SELECT typname FROM pg_type
                        WHERE typname IN (
                            'connection_status',
                            'connection_test_status',
                            'connection_failure_category',
                            'connection_audit_action',
                            'connection_audit_outcome'
                        )
                        """
                    )
                }
                assert enum_types == {
                    "connection_status",
                    "connection_test_status",
                    "connection_failure_category",
                    "connection_audit_action",
                    "connection_audit_outcome",
                }

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

                dc_uq = await unique_names("data_connections")
                assert "uq_data_connections_tenant_id" in dc_uq
                assert "uq_data_connections_tenant_id_id" in dc_uq

                memberships_uq = await unique_names("memberships")
                assert "uq_memberships_tenant_id_id" in memberships_uq

                async def foreign_key_columns(table: str) -> dict[str, list[str]]:
                    rows = await conn.fetch(
                        """
                        SELECT
                            c.conname,
                            array_agg(a.attname ORDER BY u.ordinality) AS columns
                        FROM pg_constraint c
                        JOIN pg_class rel ON rel.oid = c.conrelid
                        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                        JOIN unnest(c.conkey) WITH ORDINALITY AS u(attnum, ordinality)
                            ON TRUE
                        JOIN pg_attribute a
                            ON a.attrelid = rel.oid AND a.attnum = u.attnum
                        WHERE nsp.nspname = 'public'
                          AND rel.relname = $1
                          AND c.contype = 'f'
                        GROUP BY c.conname
                        """,
                        table,
                    )
                    return {r["conname"]: list(r["columns"]) for r in rows}

                dc_fks = await foreign_key_columns("data_connections")
                assert [
                    "tenant_id",
                    "created_by_membership_id",
                ] in dc_fks.values()
                assert [
                    "tenant_id",
                    "updated_by_membership_id",
                ] in dc_fks.values()

                tr_fks = await foreign_key_columns("connection_test_results")
                assert ["tenant_id", "connection_id"] in tr_fks.values()
                assert [
                    "tenant_id",
                    "attempted_by_membership_id",
                ] in tr_fks.values()

                ar_fks = await foreign_key_columns(
                    "connection_management_audit_records"
                )
                assert ["tenant_id", "connection_id"] in ar_fks.values()
                assert ["tenant_id", "actor_membership_id"] in ar_fks.values()

                async def index_names(table: str) -> set[str]:
                    rows = await conn.fetch(
                        """
                        SELECT indexname FROM pg_indexes
                        WHERE schemaname = 'public' AND tablename = $1
                        """,
                        table,
                    )
                    return {r["indexname"] for r in rows}

                dc_idx = await index_names("data_connections")
                assert "ix_data_connections_tenant_id" in dc_idx

                tr_idx = await index_names("connection_test_results")
                assert (
                    "ix_connection_test_results_tenant_connection_completed" in tr_idx
                )

                ar_idx = await index_names("connection_management_audit_records")
                assert "ix_connection_mgmt_audit_tenant_connection_created" in ar_idx
                assert "ix_connection_mgmt_audit_tenant_actor_created" in ar_idx
            finally:
                await conn.close()

        asyncio.run(verify())
