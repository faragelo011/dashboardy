"""Contract checks for dashboard clone endpoint (US5)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from app.models.auth_tenancy import MembershipRole
from fastapi.testclient import TestClient

from tests.saved_questions_fixtures import seed_question_catalog, seed_workspace_with_author


def _headers(monkeypatch: pytest.MonkeyPatch, user_id: uuid.UUID, email: str) -> dict[str, str]:
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(user_id), "email": email},
    )
    return {"Authorization": "Bearer fake"}


def _create_collection(
    client: TestClient,
    workspace_id: uuid.UUID,
    headers: dict[str, str],
    *,
    name: str,
) -> str:
    response = client.post(
        f"/workspaces/{workspace_id}/collections",
        json={"name": name},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def _create_dashboard(
    client: TestClient,
    workspace_id: uuid.UUID,
    headers: dict[str, str],
    *,
    collection_id: str,
) -> str:
    response = client.post(
        f"/workspaces/{workspace_id}/dashboards",
        json={
            "collection_id": collection_id,
            "title": "Executive KPIs",
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_clone_dashboard_success(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_workspace_with_author(actor_role=MembershipRole.admin))
    headers = _headers(monkeypatch, seeded.actor_user_id, "admin@example.com")

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
        dashboard_id = _create_dashboard(
            client,
            seeded.workspace_id,
            headers,
            collection_id=source_collection_id,
        )

        cloned = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/clone",
            json={
                "target_collection_id": target_collection_id,
                "title": "Executive KPIs copy",
            },
            headers=headers,
        )

    assert cloned.status_code == 201
    body = cloned.json()
    assert body["id"] != dashboard_id
    assert body["collection_id"] == target_collection_id
    assert body["title"] == "Executive KPIs copy"
    assert body["detail_level"] == "editor"


def test_clone_forbidden_for_viewer(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())

    admin_headers = _headers(monkeypatch, seeded.admin_user_id, "admin@example.com")
    with TestClient(app) as client:
        dashboard_id = _create_dashboard(
            client,
            seeded.workspace_id,
            admin_headers,
            collection_id=str(seeded.collection_id),
        )

        viewer_headers = _headers(monkeypatch, seeded.viewer_user_id, "viewer@example.com")
        forbidden = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/clone",
            json={"target_collection_id": str(seeded.collection_id)},
            headers=viewer_headers,
        )

    assert forbidden.status_code == 403
    assert forbidden.json()["error_code"] == "authz_denied"


def test_clone_rejects_missing_target_collection(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    headers = _headers(monkeypatch, seeded.admin_user_id, "admin@example.com")

    with TestClient(app) as client:
        dashboard_id = _create_dashboard(
            client,
            seeded.workspace_id,
            headers,
            collection_id=str(seeded.collection_id),
        )
        missing_target = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/clone",
            json={"target_collection_id": str(uuid.uuid4())},
            headers=headers,
        )

    assert missing_target.status_code == 422
    assert missing_target.json()["error_code"] == "invalid_parameters"


def test_clone_missing_source_dashboard(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_workspace_with_author(actor_role=MembershipRole.admin))
    headers = _headers(monkeypatch, seeded.actor_user_id, "admin@example.com")

    with TestClient(app) as client:
        target_collection_id = _create_collection(
            client,
            seeded.workspace_id,
            headers,
            name="Target",
        )
        missing = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards/{uuid.uuid4()}/clone",
            json={"target_collection_id": target_collection_id},
            headers=headers,
        )

    assert missing.status_code == 404
    assert missing.json()["error_code"] == "dashboard_not_found"

