import pytest
from app.config import get_settings


@pytest.fixture(autouse=True)
def api_test_settings(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/dashboardy_test",
    )
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
