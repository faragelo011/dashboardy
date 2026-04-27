import os

import pytest

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
    monkeypatch.setenv("DATABASE_URL", TEST_DATABASE_URL)
    monkeypatch.setenv("SUPABASE_JWKS_URL", TEST_SUPABASE_JWKS_URL)
    monkeypatch.setenv("SUPABASE_JWT_ISSUER", TEST_SUPABASE_JWT_ISSUER)
