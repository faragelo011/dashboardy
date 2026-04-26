from unittest.mock import AsyncMock, MagicMock

from app.main import app
from app.routes import ready as ready_routes
from fastapi.testclient import TestClient


def test_ready_db_up(monkeypatch):
    conn = MagicMock()
    conn.execute = AsyncMock(return_value=None)

    conn_cm = MagicMock()
    conn_cm.__aenter__ = AsyncMock(return_value=conn)
    conn_cm.__aexit__ = AsyncMock(return_value=None)

    engine = MagicMock()
    engine.connect = MagicMock(return_value=conn_cm)

    monkeypatch.setattr(ready_routes, "get_engine", lambda: engine)

    with TestClient(app) as client:
        r = client.get("/ready")

    assert r.status_code == 200
    assert r.json() == {"status": "ready"}


def test_ready_db_down(monkeypatch):
    def boom():
        raise OSError("db down")

    monkeypatch.setattr(ready_routes, "get_engine", boom)

    with TestClient(app) as client:
        r = client.get("/ready")

    assert r.status_code == 503
    assert r.json() == {"status": "not_ready", "reason": "database_unreachable"}
