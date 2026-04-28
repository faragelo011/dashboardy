"""Contract checks for external asset grants list/create (US3)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from app.models.auth_tenancy import MembershipRole
from fastapi.testclient import TestClient

from tests.asset_grants_fixtures import seed_workspace_with_admin_and_external_client


def test_asset_grants_get_200_admin_lists_grants(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    seeded = asyncio.run(seed_workspace_with_admin_and_external_client())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.admin_user_id), "email": "admin@example.com"},
    )

    with TestClient(app) as client:
        r = client.get(
            f"/workspaces/{seeded.workspace_id}/asset-grants",
            headers={"Authorization": "Bearer fake"},
        )
    assert r.status_code == 200
    body = r.json()
    assert "grants" in body
    assert any(g["id"] == str(seeded.existing_grant_id) for g in body["grants"])


def test_asset_grants_post_201_admin_creates_grant_default_can_export_false(
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
        r = client.post(
            f"/workspaces/{seeded.workspace_id}/asset-grants",
            json={
                "user_id": str(seeded.external_user_id),
                "asset_type": "dashboard",
                "asset_id": str(asset_id),
            },
            headers={"Authorization": "Bearer fake"},
        )
    assert r.status_code == 201
    body = r.json()
    assert body["user_id"] == str(seeded.external_user_id)
    assert body["asset_type"] == "dashboard"
    assert body["asset_id"] == str(asset_id)
    assert body["can_export"] is False


@pytest.mark.parametrize(
    "actor_role",
    [
        MembershipRole.analyst,
        MembershipRole.viewer,
        MembershipRole.external_client,
    ],
)
def test_asset_grants_denied_for_non_admin(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
    actor_role: MembershipRole,
):
    seeded = asyncio.run(
        seed_workspace_with_admin_and_external_client(non_admin_actor_role=actor_role)
    )
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {
            "sub": str(seeded.non_admin_user_id),
            "email": f"{actor_role.value}@example.com",
        },
    )

    with TestClient(app) as client:
        r = client.get(
            f"/workspaces/{seeded.workspace_id}/asset-grants",
            headers={"Authorization": "Bearer fake"},
        )
    assert r.status_code == 403
    assert r.json()["error_code"] == "authz_denied"

