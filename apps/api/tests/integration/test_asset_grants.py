"""Integration coverage for external asset grants (US3)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from app.models.auth_tenancy import MembershipRole
from fastapi.testclient import TestClient

from tests.asset_grants_fixtures import seed_workspace_with_admin_and_external_client


def test_admin_can_create_list_and_delete_asset_grant(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    seeded = asyncio.run(seed_workspace_with_admin_and_external_client())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.admin_user_id), "email": "admin@example.com"},
    )

    asset_id = uuid.uuid4()
    with TestClient(app) as client:
        create = client.post(
            f"/workspaces/{seeded.workspace_id}/asset-grants",
            json={
                "user_id": str(seeded.external_user_id),
                "asset_type": "dashboard",
                "asset_id": str(asset_id),
            },
            headers={"Authorization": "Bearer t"},
        )
        assert create.status_code == 201
        created = create.json()
        assert created["can_export"] is False

        listed = client.get(
            f"/workspaces/{seeded.workspace_id}/asset-grants",
            headers={"Authorization": "Bearer t"},
        )
        assert listed.status_code == 200
        assert any(g["id"] == created["id"] for g in listed.json()["grants"])

        deleted = client.delete(
            f"/workspaces/{seeded.workspace_id}/asset-grants/{created['id']}",
            headers={"Authorization": "Bearer t"},
        )
        assert deleted.status_code == 204


def test_asset_grant_duplicate_is_idempotent(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    seeded = asyncio.run(seed_workspace_with_admin_and_external_client())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.admin_user_id), "email": "admin@example.com"},
    )

    asset_id = uuid.uuid4()
    payload = {
        "user_id": str(seeded.external_user_id),
        "asset_type": "question",
        "asset_id": str(asset_id),
    }
    with TestClient(app) as client:
        r1 = client.post(
            f"/workspaces/{seeded.workspace_id}/asset-grants",
            json=payload,
            headers={"Authorization": "Bearer t"},
        )
        r2 = client.post(
            f"/workspaces/{seeded.workspace_id}/asset-grants",
            json=payload,
            headers={"Authorization": "Bearer t"},
        )
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["id"] == r2.json()["id"]


@pytest.mark.parametrize(
    "actor_role",
    [
        MembershipRole.analyst,
        MembershipRole.viewer,
        MembershipRole.external_client,
    ],
)
def test_non_admin_denied_asset_grant_management(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
    actor_role: MembershipRole,
):
    seeded = asyncio.run(
        seed_workspace_with_admin_and_external_client(non_admin_actor_role=actor_role)
    )
    assert seeded.non_admin_user_id is not None
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {
            "sub": str(seeded.non_admin_user_id),
            "email": f"{actor_role.value}@example.com",
        },
    )

    with TestClient(app) as client:
        r = client.post(
            f"/workspaces/{seeded.workspace_id}/asset-grants",
            json={
                "user_id": str(seeded.external_user_id),
                "asset_type": "dashboard",
                "asset_id": str(uuid.uuid4()),
            },
            headers={"Authorization": "Bearer t"},
        )
    assert r.status_code == 403
    assert r.json()["error_code"] == "authz_denied"

