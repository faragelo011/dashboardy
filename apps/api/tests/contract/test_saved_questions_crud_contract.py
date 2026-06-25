"""Contract checks for saved-question CRUD (Feature 005 US1)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from app.models.auth_tenancy import MembershipRole
from fastapi.testclient import TestClient

from tests.saved_questions_fixtures import seed_workspace_with_author


def _assert_internal_detail(body: dict) -> None:
    for key in (
        "id",
        "collection_id",
        "title",
        "permission",
        "created_at",
        "updated_at",
        "detail_level",
        "parameters",
        "sql_text",
    ):
        assert key in body
    assert body["detail_level"] == "internal"
    assert isinstance(body["parameters"], list)
    assert isinstance(body["sql_text"], str)


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


def test_saved_questions_crud_contract(
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

        created = client.post(
            f"/workspaces/{seeded.workspace_id}/questions",
            json={
                "collection_id": collection_id,
                "title": "Monthly revenue",
                "description": "KPI",
                "sql_text": "SELECT 1",
                "parameters": [
                    {
                        "name": "region",
                        "type": "string",
                        "required": True,
                    }
                ],
            },
            headers=headers,
        )
        assert created.status_code == 201
        body = created.json()
        _assert_internal_detail(body)
        question_id = body["id"]

        listed = client.get(
            f"/workspaces/{seeded.workspace_id}/questions",
            params={"collection_id": collection_id},
            headers=headers,
        )
        assert listed.status_code == 200
        assert len(listed.json()["questions"]) == 1

        detail = client.get(
            f"/workspaces/{seeded.workspace_id}/questions/{question_id}",
            headers=headers,
        )
        assert detail.status_code == 200
        _assert_internal_detail(detail.json())
        assert detail.json()["sql_text"] == "SELECT 1"

        updated = client.patch(
            f"/workspaces/{seeded.workspace_id}/questions/{question_id}",
            json={
                "expected_updated_at": detail.json()["updated_at"],
                "title": "Monthly revenue (v2)",
                "sql_text": "SELECT 2",
            },
            headers=headers,
        )
        assert updated.status_code == 200
        assert updated.json()["title"] == "Monthly revenue (v2)"
        assert updated.json()["sql_text"] == "SELECT 2"

        deleted = client.delete(
            f"/workspaces/{seeded.workspace_id}/questions/{question_id}",
            headers=headers,
        )
        assert deleted.status_code == 204

        missing = client.get(
            f"/workspaces/{seeded.workspace_id}/questions/{question_id}",
            headers=headers,
        )
        assert missing.status_code == 404
        assert missing.json()["error_code"] == "question_not_found"


def test_saved_questions_422_invalid_parameters(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_workspace_with_author(actor_role=MembershipRole.analyst))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.actor_user_id), "email": "analyst@example.com"},
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        collection_id = _create_collection(client, seeded.workspace_id, headers)
        r = client.post(
            f"/workspaces/{seeded.workspace_id}/questions",
            json={
                "collection_id": collection_id,
                "title": "Bad params",
                "sql_text": "SELECT 1",
                "parameters": [
                    {"name": "a", "type": "string", "required": True},
                    {"name": "a", "type": "number", "required": False},
                ],
            },
            headers=headers,
        )
    assert r.status_code == 422
    assert r.json()["error_code"] == "invalid_parameters"
