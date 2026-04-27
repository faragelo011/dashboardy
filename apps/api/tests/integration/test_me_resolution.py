"""Integration coverage for GET /me with database-backed memberships."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.auth_context.context import InvalidJwtError
from app.main import app
from fastapi.testclient import TestClient

from tests.me_fixtures import seed_active_member, seed_inactive_member


def test_me_missing_jwt_returns_401():
    with TestClient(app) as client:
        r = client.get("/me")
    assert r.status_code == 401


def test_me_invalid_jwt_returns_401(monkeypatch: pytest.MonkeyPatch):
    def boom(_token: str) -> None:
        raise InvalidJwtError("expired")

    monkeypatch.setattr("app.auth_context.dependencies.decode_supabase_jwt", boom)
    with TestClient(app) as client:
        r = client.get("/me", headers={"Authorization": "Bearer bad"})
    assert r.status_code == 401


def test_me_valid_token_no_membership_returns_403(
    live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    uid = uuid.uuid4()
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "orphan@example.com"},
    )
    with TestClient(app) as client:
        r = client.get("/me", headers={"Authorization": "Bearer t"})
    assert r.status_code == 403
    assert r.json()["error_code"] == "no_membership"


def test_me_active_membership_returns_200(
    live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    uid = uuid.uuid4()
    asyncio.run(seed_active_member(uid))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "active@example.com"},
    )
    with TestClient(app) as client:
        r = client.get("/me", headers={"Authorization": "Bearer t"})
    assert r.status_code == 200
    body = r.json()
    assert body["current_workspace"]["membership_status"] == "active"
    assert body["current_workspace"]["role"] in (
        "admin",
        "analyst",
        "viewer",
        "external_client",
    )


def test_me_inactive_membership_returns_403(
    live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    uid = uuid.uuid4()
    asyncio.run(seed_inactive_member(uid))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "gone@example.com"},
    )
    with TestClient(app) as client:
        r = client.get("/me", headers={"Authorization": "Bearer t"})
    assert r.status_code == 403
    assert r.json()["error_code"] == "inactive_membership"
