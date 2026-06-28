"""Contract checks for saved-question clone endpoint (US3)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from app.models.auth_tenancy import MembershipRole
from fastapi.testclient import TestClient

from tests.saved_questions_fixtures import (
    seed_clone_scenario,
    seed_workspace_with_author,
)


def _create_collection(
    client: TestClient,
    workspace_id: uuid.UUID,
    headers: dict,
    *,
    name: str,
) -> str:
    response = client.post(
        f"/workspaces/{workspace_id}/collections",
        json={"name": name},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["id"]


def _create_question(
    client: TestClient,
    workspace_id: uuid.UUID,
    headers: dict,
    *,
    collection_id: str,
) -> str:
    response = client.post(
        f"/workspaces/{workspace_id}/questions",
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
    assert response.status_code == 201
    return response.json()["id"]


def test_clone_saved_question_success(
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
        source_collection_id = _create_collection(
            client,
            seeded.workspace_id,
            headers,
            name="Source",
        )
        target_collection_id = _create_collection(
            client,
            seeded.workspace_id,
            headers,
            name="Target",
        )
        question_id = _create_question(
            client,
            seeded.workspace_id,
            headers,
            collection_id=source_collection_id,
        )

        cloned = client.post(
            f"/workspaces/{seeded.workspace_id}/questions/{question_id}/clone",
            json={
                "target_collection_id": target_collection_id,
                "title": "Monthly revenue copy",
            },
            headers=headers,
        )

    assert cloned.status_code == 201
    body = cloned.json()
    assert body["id"] != question_id
    assert body["collection_id"] == target_collection_id
    assert body["title"] == "Monthly revenue copy"
    assert body["detail_level"] == "internal"
    assert body["sql_text"] == "SELECT 1"


def test_clone_forbidden_target_collection(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_clone_scenario())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {
            "sub": str(seeded.restricted_user_id),
            "email": "restricted@example.com",
        },
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        forbidden = client.post(
            f"/workspaces/{seeded.workspace_id}/questions/{seeded.source_question_id}/clone",
            json={"target_collection_id": str(seeded.target_collection_id)},
            headers=headers,
        )

    assert forbidden.status_code == 403
    assert forbidden.json()["error_code"] == "authz_denied"


def test_clone_denied_for_viewer_with_question_edit_grant(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_clone_scenario())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {
            "sub": str(seeded.source_widened_user_id),
            "email": "widened@example.com",
        },
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        forbidden = client.post(
            f"/workspaces/{seeded.workspace_id}/questions/{seeded.source_question_id}/clone",
            json={"target_collection_id": str(seeded.target_collection_id)},
            headers=headers,
        )

    assert forbidden.status_code == 403
    assert forbidden.json()["error_code"] == "authz_denied"


def test_clone_missing_source_question(
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
        target_collection_id = _create_collection(
            client,
            seeded.workspace_id,
            headers,
            name="Target",
        )
        missing = client.post(
            f"/workspaces/{seeded.workspace_id}/questions/{uuid.uuid4()}/clone",
            json={"target_collection_id": target_collection_id},
            headers=headers,
        )

    assert missing.status_code == 404
    assert missing.json()["error_code"] == "question_not_found"
