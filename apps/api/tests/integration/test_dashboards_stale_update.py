"""Integration tests for stale dashboard update refusal (US1)."""

from __future__ import annotations

import asyncio

import pytest
from app.main import app
from app.models.auth_tenancy import MembershipRole
from fastapi.testclient import TestClient

from tests.saved_questions_fixtures import seed_workspace_with_author


def _headers(monkeypatch: pytest.MonkeyPatch, seeded) -> dict[str, str]:
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.actor_user_id), "email": "analyst@example.com"},
    )
    return {"Authorization": "Bearer fake"}


def test_stale_dashboard_update_rejected(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_workspace_with_author(actor_role=MembershipRole.analyst))
    headers = _headers(monkeypatch, seeded)

    with TestClient(app) as client:
        collection = client.post(
            f"/workspaces/{seeded.workspace_id}/collections",
            json={"name": "Revenue"},
            headers=headers,
        )
        collection_id = collection.json()["id"]

        created = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards",
            json={"collection_id": collection_id, "title": "Revenue Overview"},
            headers=headers,
        )
        dashboard_id = created.json()["id"]

        stale = client.patch(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            json={
                "updated_at": "2000-01-01T00:00:00+00:00",
                "title": "Stale title",
            },
            headers=headers,
        )
    assert stale.status_code == 409
    assert stale.json()["error_code"] == "stale_update"
