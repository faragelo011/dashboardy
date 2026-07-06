"""Integration tests for dashboard title uniqueness per collection (US1)."""

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


def test_duplicate_dashboard_title_rejected_in_same_collection(
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

        first = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards",
            json={"collection_id": collection_id, "title": "Revenue Overview"},
            headers=headers,
        )
        assert first.status_code == 201

        dup = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards",
            json={"collection_id": collection_id, "title": "  Revenue Overview  "},
            headers=headers,
        )
    assert dup.status_code == 409
    assert dup.json()["error_code"] == "duplicate_dashboard_title"


def test_same_dashboard_title_allowed_in_different_collections(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_workspace_with_author(actor_role=MembershipRole.analyst))
    headers = _headers(monkeypatch, seeded)

    with TestClient(app) as client:
        collection_a = client.post(
            f"/workspaces/{seeded.workspace_id}/collections",
            json={"name": "Revenue A"},
            headers=headers,
        ).json()["id"]
        collection_b = client.post(
            f"/workspaces/{seeded.workspace_id}/collections",
            json={"name": "Revenue B"},
            headers=headers,
        ).json()["id"]

        first = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards",
            json={"collection_id": collection_a, "title": "Revenue Overview"},
            headers=headers,
        )
        second = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards",
            json={"collection_id": collection_b, "title": "Revenue Overview"},
            headers=headers,
        )
    assert first.status_code == 201
    assert second.status_code == 201
