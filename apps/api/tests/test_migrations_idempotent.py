import os
import subprocess
from pathlib import Path

import asyncpg
from testcontainers.postgres import PostgresContainer


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


def test_migrations_are_idempotent():
    api_dir = Path(__file__).resolve().parents[1]

    with PostgresContainer("postgres:16-alpine") as pg:
        sync_url = pg.get_connection_url()
        asyncpg_url = _to_asyncpg_database_url(sync_url)
        dsn = _to_asyncpg_dsn(sync_url)

        env = os.environ.copy()
        env["DATABASE_URL"] = asyncpg_url

        cmd = ["uv", "run", "alembic", "upgrade", "head"]
        r1 = subprocess.run(cmd, cwd=api_dir, env=env, capture_output=True, text=True)
        assert r1.returncode == 0, r1.stderr

        r2 = subprocess.run(cmd, cwd=api_dir, env=env, capture_output=True, text=True)
        assert r2.returncode == 0, r2.stderr

        async def check_version_table():
            conn = await asyncpg.connect(dsn)
            try:
                count = await conn.fetchval("SELECT count(*) FROM alembic_version")
                assert count == 1
            finally:
                await conn.close()

        import asyncio

        asyncio.run(check_version_table())

