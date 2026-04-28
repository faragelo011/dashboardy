"""Contract checks for PATCH workspace member (US2)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.admin.routes import get_supabase_admin_provider
from app.admin.supabase_admin import InvitedUser
from app.main import app
from app.models.auth_tenancy import MembershipRole
from fastapi.testclient import TestClient

from tests.member_management_fixtures import seed_workspace_with_actor


class _FakeSupabaseAdmin:
    def __init__(self, invited_user_id: uuid.UUID) -> None:
        self._user_id = invited_user_id

    async def invite_user(self, *, email: str) -> InvitedUser:
        return InvitedUser(user_id=self._user_id, email=email)


def test_member_patch_200_admin_updates_role_and_deactivates(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    seeded = asyncio.run(seed_workspace_with_actor(actor_role=MembershipRole.admin))
    invited_user_id = uuid.uuid4()
    app.dependency_overrides[get_supabase_admin_provider] = (
        lambda: lambda: _FakeSupabaseAdmin(invited_user_id)
    )
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.actor_user_id), "email": "admin@example.com"},
    )

    try:
        with TestClient(app) as client:
            invite = client.post(
                f"/workspaces/{seeded.workspace_id}/members",
                json={"email": "target@example.com", "role": "viewer"},
                headers={"Authorization": "Bearer fake"},
            )
            assert invite.status_code == 201
            membership_id = invite.json()["id"]

            role_update = client.patch(
                f"/workspaces/{seeded.workspace_id}/members/{membership_id}",
                json={"role": "analyst"},
                headers={"Authorization": "Bearer fake"},
            )
            assert role_update.status_code == 200
            assert role_update.json()["role"] == "analyst"

            deact = client.patch(
                f"/workspaces/{seeded.workspace_id}/members/{membership_id}",
                json={"status": "inactive"},
                headers={"Authorization": "Bearer fake"},
            )
            assert deact.status_code == 200
            body = deact.json()
            assert body["status"] == "inactive"
            assert body["deactivated_at"] is not None
    finally:
        app.dependency_overrides.pop(get_supabase_admin_provider, None)


def test_member_patch_403_non_admin_denied(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    seeded = asyncio.run(seed_workspace_with_actor(actor_role=MembershipRole.viewer))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.actor_user_id), "email": "viewer@example.com"},
    )
    with TestClient(app) as client:
        r = client.patch(
            f"/workspaces/{seeded.workspace_id}/members/{seeded.actor_membership_id}",
            json={"role": "admin"},
            headers={"Authorization": "Bearer fake"},
        )
    assert r.status_code == 403
    assert r.json()["error_code"] == "authz_denied"

