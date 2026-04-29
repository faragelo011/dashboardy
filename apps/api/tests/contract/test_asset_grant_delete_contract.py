"""Contract checks for external asset grant deletion (US3)."""

from __future__ import annotations

import asyncio

import pytest
from app.main import app
from fastapi.testclient import TestClient

from tests.asset_grants_fixtures import seed_workspace_with_admin_and_external_client


def test_asset_grant_delete_204_admin_deletes_grant(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    seeded = asyncio.run(seed_workspace_with_admin_and_external_client())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.admin_user_id), "email": "admin@example.com"},
    )

    with TestClient(app) as client:
        d = client.delete(
            f"/workspaces/{seeded.workspace_id}/asset-grants/{seeded.existing_grant_id}",
            headers={"Authorization": "Bearer fake"},
        )
        assert d.status_code == 204

        after = client.get(
            f"/workspaces/{seeded.workspace_id}/asset-grants",
            headers={"Authorization": "Bearer fake"},
        )
    assert after.status_code == 200
    assert all(g["id"] != str(seeded.existing_grant_id) for g in after.json()["grants"])

