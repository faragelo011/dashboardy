"""Integration coverage for admin member management (US2)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.admin.routes import get_supabase_admin_provider
from app.admin.supabase_admin import InvitedUser
from app.main import app
from app.models.auth_tenancy import MembershipRole, MembershipStatus
from fastapi.testclient import TestClient

from tests.member_management_fixtures import seed_workspace_with_actor


class _FakeSupabaseAdmin:
    def __init__(self) -> None:
        self._by_email: dict[str, uuid.UUID] = {}

    async def invite_user(self, *, email: str) -> InvitedUser:
        uid = self._by_email.setdefault(email, uuid.uuid4())
        return InvitedUser(user_id=uid, email=email)


def test_admin_can_invite_update_and_deactivate(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    seeded = asyncio.run(seed_workspace_with_actor(actor_role=MembershipRole.admin))
    fake_admin = _FakeSupabaseAdmin()
    app.dependency_overrides[get_supabase_admin_provider] = lambda: lambda: fake_admin
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.actor_user_id), "email": "admin@example.com"},
    )

    try:
        with TestClient(app) as client:
            invite = client.post(
                f"/workspaces/{seeded.workspace_id}/members",
                json={"email": "invitee@example.com", "role": "viewer"},
                headers={"Authorization": "Bearer t"},
            )
            assert invite.status_code == 201
            member = invite.json()
            membership_id = member["id"]

            dupe = client.post(
                f"/workspaces/{seeded.workspace_id}/members",
                json={"email": "invitee@example.com", "role": "viewer"},
                headers={"Authorization": "Bearer t"},
            )
            assert dupe.status_code == 201
            assert dupe.json()["id"] == membership_id

            role_update = client.patch(
                f"/workspaces/{seeded.workspace_id}/members/{membership_id}",
                json={"role": "analyst"},
                headers={"Authorization": "Bearer t"},
            )
            assert role_update.status_code == 200
            assert role_update.json()["role"] == "analyst"

            deact = client.patch(
                f"/workspaces/{seeded.workspace_id}/members/{membership_id}",
                json={"status": "inactive"},
                headers={"Authorization": "Bearer t"},
            )
            assert deact.status_code == 200
            assert deact.json()["status"] == "inactive"
            assert deact.json()["deactivated_at"] is not None

            reinvite = client.post(
                f"/workspaces/{seeded.workspace_id}/members",
                json={"email": "invitee@example.com", "role": "viewer"},
                headers={"Authorization": "Bearer t"},
            )
            assert reinvite.status_code == 409
            assert reinvite.json()["error_code"] == "membership_conflict"
    finally:
        app.dependency_overrides.pop(get_supabase_admin_provider, None)


@pytest.mark.parametrize(
    "actor_role",
    [
        MembershipRole.analyst,
        MembershipRole.viewer,
        MembershipRole.external_client,
    ],
)
def test_non_admin_invite_denied_before_supabase_admin_config_is_required(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
    actor_role: MembershipRole,
):
    seeded = asyncio.run(seed_workspace_with_actor(actor_role=actor_role))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {
            "sub": str(seeded.actor_user_id),
            "email": f"{actor_role}@example.com",
        },
    )
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)

    with TestClient(app) as client:
        r = client.post(
            f"/workspaces/{seeded.workspace_id}/members",
            json={"email": "invitee@example.com", "role": "viewer"},
            headers={"Authorization": "Bearer t"},
        )
    assert r.status_code == 403
    assert r.json()["error_code"] == "authz_denied"


def test_inactive_member_cannot_manage_members(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    seeded = asyncio.run(
        seed_workspace_with_actor(
            actor_role=MembershipRole.admin,
            actor_status=MembershipStatus.inactive,
        )
    )
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.actor_user_id), "email": "inactive@example.com"},
    )

    with TestClient(app) as client:
        r = client.get(
            f"/workspaces/{seeded.workspace_id}/members",
            headers={"Authorization": "Bearer t"},
        )
    assert r.status_code == 403
    assert r.json()["error_code"] == "inactive_membership"

