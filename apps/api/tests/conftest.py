import os
import subprocess
from pathlib import Path

import pytest
from testcontainers.postgres import PostgresContainer

from tests.docker_util import skip_if_no_docker

TEST_DATABASE_URL = (
    "postgresql+asyncpg://postgres:postgres@localhost:5432/dashboardy_test"
)
TEST_SUPABASE_JWKS_URL = "https://example.invalid/.well-known/jwks.json"
TEST_SUPABASE_JWT_ISSUER = "https://example.invalid/auth/v1"

os.environ.setdefault("DATABASE_URL", TEST_DATABASE_URL)
os.environ["SUPABASE_JWKS_URL"] = TEST_SUPABASE_JWKS_URL
os.environ["SUPABASE_JWT_ISSUER"] = TEST_SUPABASE_JWT_ISSUER


@pytest.fixture(autouse=True)
def api_test_settings(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWKS_URL", TEST_SUPABASE_JWKS_URL)
    monkeypatch.setenv("SUPABASE_JWT_ISSUER", TEST_SUPABASE_JWT_ISSUER)
    from app.db.session import get_async_session_maker, get_engine

    get_async_session_maker.cache_clear()
    get_engine.cache_clear()


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


@pytest.fixture(scope="session")
def live_postgres() -> str:
    """Start migrated Postgres once per session; yields async DATABASE_URL string."""

    skip_if_no_docker()
    api_dir = Path(__file__).resolve().parents[1]

    with PostgresContainer("postgres:16-alpine") as pg:
        db_url = _to_asyncpg_database_url(pg.get_connection_url())
        alembic_env = {
            **os.environ,
            "DATABASE_URL": db_url,
            "SUPABASE_JWKS_URL": TEST_SUPABASE_JWKS_URL,
            "SUPABASE_JWT_ISSUER": TEST_SUPABASE_JWT_ISSUER,
        }
        result = subprocess.run(
            ["uv", "run", "alembic", "upgrade", "head"],
            cwd=api_dir,
            env=alembic_env,
            capture_output=True,
            text=True,
            timeout=120,
        )
        assert result.returncode == 0, (
            "alembic upgrade head failed\n"
            f"--- stdout ---\n{result.stdout}\n"
            f"--- stderr ---\n{result.stderr}\n"
        )
        yield db_url


@pytest.fixture
def use_live_postgres(live_postgres: str, monkeypatch: pytest.MonkeyPatch):
    """Point the app at the session container for this test only; env restored after."""

    monkeypatch.setenv("DATABASE_URL", live_postgres)
    monkeypatch.setenv("SUPABASE_JWKS_URL", TEST_SUPABASE_JWKS_URL)
    monkeypatch.setenv("SUPABASE_JWT_ISSUER", TEST_SUPABASE_JWT_ISSUER)
    from app.db.session import get_async_session_maker, get_engine

    get_engine.cache_clear()
    get_async_session_maker.cache_clear()
    yield
    get_engine.cache_clear()
    get_async_session_maker.cache_clear()
