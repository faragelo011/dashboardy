import os

import pytest

TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/dashboardy_test"
os.environ.setdefault("DATABASE_URL", TEST_DATABASE_URL)


@pytest.fixture(autouse=True)
def api_test_settings(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", TEST_DATABASE_URL)
