"""Contract checks for collection CRUD (Feature 005 US1)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.auth_context.context import InvalidJwtError
from app.main import app
from app.models.auth_tenancy import MembershipRole
from fastapi.testclient import TestClient

from tests.saved_questions_fixtures import seed_workspace_with_author


def _assert_collection(body: dict) -> None:
    for key in (
        "id",
        "workspace_id",
        "name",
        "slug",
        "sort_order",
        "permission",
        "created_at",
        "updated_at",
    ):
        assert key in body
    assert body["permission"] in {"view", "edit"}


def test_collections_401_missing_authorization() -> None:
    with TestClient(app) as client:
        r = client.get(f"/workspaces/{uuid.uuid4()}/collections")
    assert r.status_code == 401
    assert r.json()["error_code"] == "auth_required"


def test_collections_401_invalid_jwt(monkeypatch: pytest.MonkeyPatch) -> None:
    def boom(_token: str) -> None:
        raise InvalidJwtError("bad")

    monkeypatch.setattr("app.auth_context.dependencies.decode_supabase_jwt", boom)
    with TestClient(app) as client:
        r = client.get(
            f"/workspaces/{uuid.uuid4()}/collections",
            headers={"Authorization": "Bearer x.y.z"},
        )
    assert r.status_code == 401
    assert r.json()["error_code"] == "auth_required"


def test_collections_crud_contract_analyst(
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
        empty = client.get(
            f"/workspaces/{seeded.workspace_id}/collections",
            headers=headers,
        )
        assert empty.status_code == 200
        assert empty.json()["collections"] == []

        created = client.post(
            f"/workspaces/{seeded.workspace_id}/collections",
            json={"name": " Revenue ", "sort_order": 1},
            headers=headers,
        )
        assert created.status_code == 201
        body = created.json()
        _assert_collection(body)
        assert body["name"] == "Revenue"
        assert body["permission"] == "edit"
        collection_id = body["id"]

        listed = client.get(
            f"/workspaces/{seeded.workspace_id}/collections",
            headers=headers,
        )
        assert listed.status_code == 200
        assert len(listed.json()["collections"]) == 1

        detail = client.get(
            f"/workspaces/{seeded.workspace_id}/collections/{collection_id}",
            headers=headers,
        )
        assert detail.status_code == 200
        _assert_collection(detail.json())

        updated = client.patch(
            f"/workspaces/{seeded.workspace_id}/collections/{collection_id}",
            json={
                "expected_updated_at": detail.json()["updated_at"],
                "name": "Revenue KPIs",
                "sort_order": 2,
            },
            headers=headers,
        )
        assert updated.status_code == 200
        assert updated.json()["name"] == "Revenue KPIs"
        assert updated.json()["sort_order"] == 2

        deleted = client.delete(
            f"/workspaces/{seeded.workspace_id}/collections/{collection_id}",
            headers=headers,
        )
        assert deleted.status_code == 204

        missing = client.get(
            f"/workspaces/{seeded.workspace_id}/collections/{collection_id}",
            headers=headers,
        )
        assert missing.status_code == 404
        assert missing.json()["error_code"] == "collection_not_found"


def test_collections_403_viewer_cannot_create(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_workspace_with_author(actor_role=MembershipRole.viewer))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.actor_user_id), "email": "viewer@example.com"},
    )
    with TestClient(app) as client:
        r = client.post(
            f"/workspaces/{seeded.workspace_id}/collections",
            json={"name": "Blocked"},
            headers={"Authorization": "Bearer fake"},
        )
    assert r.status_code == 403
    assert r.json()["error_code"] == "authz_denied"
