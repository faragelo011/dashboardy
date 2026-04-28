"""Contract checks for workspace members list/invite (US2)."""

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


def test_members_get_200_admin_lists_members(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    seeded = asyncio.run(
        seed_workspace_with_actor(
            actor_role=MembershipRole.admin, create_other_member=True
        )
    )
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.actor_user_id), "email": "admin@example.com"},
    )
    with TestClient(app) as client:
        r = client.get(
            f"/workspaces/{seeded.workspace_id}/members",
            headers={"Authorization": "Bearer fake"},
        )
    assert r.status_code == 200
    body = r.json()
    assert "members" in body
    assert len(body["members"]) >= 2
    assert any(m["user_id"] == str(seeded.actor_user_id) for m in body["members"])


def test_members_get_403_non_admin_denied(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    seeded = asyncio.run(seed_workspace_with_actor(actor_role=MembershipRole.viewer))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.actor_user_id), "email": "viewer@example.com"},
    )
    with TestClient(app) as client:
        r = client.get(
            f"/workspaces/{seeded.workspace_id}/members",
            headers={"Authorization": "Bearer fake"},
        )
    assert r.status_code == 403
    assert r.json()["error_code"] == "authz_denied"


def test_members_post_201_admin_invite_idempotent_on_duplicate_email(
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
            payload = {"email": "newbie@example.com", "role": "viewer"}
            r1 = client.post(
                f"/workspaces/{seeded.workspace_id}/members",
                json=payload,
                headers={"Authorization": "Bearer fake"},
            )
            r2 = client.post(
                f"/workspaces/{seeded.workspace_id}/members",
                json=payload,
                headers={"Authorization": "Bearer fake"},
            )
        assert r1.status_code == 201
        assert r2.status_code == 201
        assert r1.json()["id"] == r2.json()["id"]
        assert r1.json()["user_id"] == str(invited_user_id)
    finally:
        app.dependency_overrides.pop(get_supabase_admin_provider, None)

