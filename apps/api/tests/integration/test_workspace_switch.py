"""Integration coverage for POST /workspaces/switch (US4)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from fastapi.testclient import TestClient

from tests.workspace_switch_fixtures import seed_workspace_switch_actor


def test_workspace_switch_current_workspace_is_no_op(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    seeded = asyncio.run(seed_workspace_switch_actor())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.actor_user_id), "email": "viewer@example.com"},
    )
    with TestClient(app) as client:
        r = client.post(
            "/workspaces/switch",
            json={"workspace_id": str(seeded.workspace_id)},
            headers={"Authorization": "Bearer t"},
        )
    assert r.status_code == 200
    assert r.json()["current_workspace"]["workspace_id"] == str(seeded.workspace_id)


def test_workspace_switch_unavailable_workspace_denied(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    seeded = asyncio.run(seed_workspace_switch_actor())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.actor_user_id), "email": "viewer@example.com"},
    )
    with TestClient(app) as client:
        r = client.post(
            "/workspaces/switch",
            json={"workspace_id": str(uuid.uuid4())},
            headers={"Authorization": "Bearer t"},
        )
    assert r.status_code == 403
    assert r.json()["error_code"] == "authz_denied"

