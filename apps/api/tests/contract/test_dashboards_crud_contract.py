"""Contract checks for dashboard CRUD (Feature 006 US1)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from app.models.auth_tenancy import MembershipRole
from fastapi.testclient import TestClient

from tests.saved_questions_fixtures import seed_workspace_with_author


def _assert_editor_detail(body: dict) -> None:
    for key in (
        "id",
        "collection_id",
        "title",
        "definition",
        "widgets",
        "updated_at",
        "detail_level",
        "can_edit",
    ):
        assert key in body
    assert body["detail_level"] == "editor"
    assert isinstance(body["widgets"], list)
    assert isinstance(body["definition"], dict)


def _create_collection(
    client: TestClient,
    workspace_id: uuid.UUID,
    headers: dict,
) -> str:
    r = client.post(
        f"/workspaces/{workspace_id}/collections",
        json={"name": "Revenue"},
        headers=headers,
    )
    assert r.status_code == 201
    return r.json()["id"]


def _create_question(
    client: TestClient,
    workspace_id: uuid.UUID,
    collection_id: str,
    headers: dict,
) -> str:
    r = client.post(
        f"/workspaces/{workspace_id}/questions",
        json={
            "collection_id": collection_id,
            "title": "Monthly revenue",
            "sql_text": "SELECT 1 AS amount",
            "parameters": [],
        },
        headers=headers,
    )
    assert r.status_code == 201
    return r.json()["id"]


def test_dashboards_crud_contract(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_workspace_with_author(actor_role=MembershipRole.admin))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.actor_user_id), "email": "admin@example.com"},
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        collection_id = _create_collection(client, seeded.workspace_id, headers)
        question_id = _create_question(
            client, seeded.workspace_id, collection_id, headers
        )

        created = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards",
            json={
                "collection_id": collection_id,
                "title": "Revenue Overview",
                "widgets": [
                    {
                        "widget_type": "kpi",
                        "saved_question_id": question_id,
                        "layout": {"x": 0, "y": 0, "w": 4, "h": 2},
                    }
                ],
            },
            headers=headers,
        )
        assert created.status_code == 201
        body = created.json()
        _assert_editor_detail(body)
        dashboard_id = body["id"]
        widget_id = body["widgets"][0]["id"]

        listed = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards",
            params={"collection_id": collection_id},
            headers=headers,
        )
        assert listed.status_code == 200
        assert len(listed.json()["dashboards"]) == 1

        detail = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            headers=headers,
        )
        assert detail.status_code == 200
        _assert_editor_detail(detail.json())
        assert detail.json()["widgets"][0]["saved_question_id"] == question_id

        updated = client.patch(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            json={
                "updated_at": detail.json()["updated_at"],
                "title": "Revenue Overview (v2)",
                "widgets": [
                    {
                        "id": widget_id,
                        "widget_type": "kpi",
                        "saved_question_id": question_id,
                        "layout": {"x": 0, "y": 0, "w": 6, "h": 2},
                    }
                ],
            },
            headers=headers,
        )
        assert updated.status_code == 200
        assert updated.json()["title"] == "Revenue Overview (v2)"

        deleted = client.delete(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            headers=headers,
        )
        assert deleted.status_code == 204

        missing = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            headers=headers,
        )
        assert missing.status_code == 404
        assert missing.json()["error_code"] == "dashboard_not_found"
