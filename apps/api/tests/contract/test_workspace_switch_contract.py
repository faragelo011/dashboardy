"""Contract checks for POST /workspaces/switch (US4)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from fastapi.testclient import TestClient

from tests.workspace_switch_fixtures import seed_workspace_switch_actor


def test_workspace_switch_200_current_workspace_no_op(
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
            headers={"Authorization": "Bearer fake"},
        )
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) == {"user", "current_workspace", "workspaces"}
    assert body["current_workspace"]["workspace_id"] == str(seeded.workspace_id)
    assert len(body["workspaces"]) == 1


def test_workspace_switch_403_unavailable_workspace_denied(
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
            headers={"Authorization": "Bearer fake"},
        )
    assert r.status_code == 403
    assert r.json()["error_code"] == "authz_denied"

