"""Contract checks for GET /me (200/401/403 shapes)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.auth_context.context import InvalidJwtError
from app.main import app
from fastapi.testclient import TestClient

from tests.me_fixtures import seed_active_member, seed_inactive_member


def test_me_401_missing_authorization():
    with TestClient(app) as client:
        r = client.get("/me")
    assert r.status_code == 401
    body = r.json()
    assert body["error_code"] == "auth_required"
    assert "message" in body


def test_me_401_invalid_jwt(monkeypatch: pytest.MonkeyPatch):
    def boom(_token: str):
        raise InvalidJwtError("bad")

    monkeypatch.setattr("app.auth_context.dependencies.decode_supabase_jwt", boom)
    with TestClient(app) as client:
        r = client.get("/me", headers={"Authorization": "Bearer x.y.z"})
    assert r.status_code == 401
    assert r.json()["error_code"] == "auth_required"


def test_me_403_no_membership(live_postgres: None, monkeypatch: pytest.MonkeyPatch):
    uid = uuid.uuid4()
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "nobody@example.com"},
    )
    with TestClient(app) as client:
        r = client.get("/me", headers={"Authorization": "Bearer fake"})
    assert r.status_code == 403
    assert r.json()["error_code"] == "no_membership"


def test_me_403_inactive_membership(
    live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    uid = uuid.uuid4()
    asyncio.run(seed_inactive_member(uid))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "inactive@example.com"},
    )
    with TestClient(app) as client:
        r = client.get("/me", headers={"Authorization": "Bearer fake"})
    assert r.status_code == 403
    assert r.json()["error_code"] == "inactive_membership"


def test_me_200_active_member(live_postgres: None, monkeypatch: pytest.MonkeyPatch):
    uid = uuid.uuid4()
    asyncio.run(seed_active_member(uid))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "member@example.com"},
    )
    with TestClient(app) as client:
        r = client.get("/me", headers={"Authorization": "Bearer fake"})
    assert r.status_code == 200
    data = r.json()
    assert set(data.keys()) == {"user", "current_workspace", "workspaces"}
    assert data["user"]["id"] == str(uid)
    assert data["user"]["email"] == "member@example.com"
    ws = data["current_workspace"]
    required_ws = {
        "tenant_id",
        "workspace_id",
        "workspace_name",
        "role",
        "membership_status",
    }
    assert required_ws <= set(ws.keys())
    assert len(data["workspaces"]) == 1
    assert data["workspaces"][0]["workspace_id"] == ws["workspace_id"]
