from __future__ import annotations

from typing import Annotated
from uuid import UUID

import pytest
from app.auth_context.dependencies import get_current_user_id
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient


@pytest.fixture
def auth_app(monkeypatch):
    import app.auth_context.dependencies as auth_deps

    app = FastAPI()

    @app.get("/__whoami")
    def whoami(user_id: Annotated[UUID, Depends(get_current_user_id)]):
        return {"user_id": str(user_id)}

    with TestClient(app) as client:
        yield client, monkeypatch, auth_deps


def test_missing_bearer_returns_401(auth_app):
    client, _monkeypatch, _jwt_mod = auth_app
    r = client.get("/__whoami")
    assert r.status_code == 401
    assert r.json()["detail"]["error_code"] == "auth_required"


def test_invalid_scheme_returns_401(auth_app):
    client, _monkeypatch, _jwt_mod = auth_app
    r = client.get("/__whoami", headers={"Authorization": "Basic abc"})
    assert r.status_code == 401
    assert r.json()["detail"]["error_code"] == "auth_required"


def test_invalid_jwt_returns_401(auth_app):
    client, monkeypatch, auth_deps = auth_app

    def boom(_token: str) -> None:
        from app.auth_context.context import InvalidJwtError

        raise InvalidJwtError("bad")

    monkeypatch.setattr(auth_deps, "verify_supabase_jwt", boom)
    r = client.get("/__whoami", headers={"Authorization": "Bearer x.y.z"})
    assert r.status_code == 401
    assert r.json()["detail"]["error_code"] == "auth_required"


def test_valid_jwt_returns_user_id(auth_app):
    client, monkeypatch, auth_deps = auth_app
    uid = UUID("3fa85f64-5717-4562-b3fc-2c963f66afa6")

    monkeypatch.setattr(auth_deps, "verify_supabase_jwt", lambda _token: uid)
    r = client.get("/__whoami", headers={"Authorization": "Bearer signed.test.token"})
    assert r.status_code == 200
    assert r.json()["user_id"] == str(uid)
