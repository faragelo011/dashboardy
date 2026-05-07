"""Contract checks for GET /workspaces/{workspace_id}/connection (200/401/403)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.auth_context.context import InvalidJwtError
from app.main import app
from fastapi.testclient import TestClient

from tests.factories import auth_tenancy as factories


async def _seed_member_with_role(*, user_id: uuid.UUID, role: str) -> uuid.UUID:
    from app.db.session import get_async_session_maker, get_engine
    from app.models.auth_tenancy import MembershipRole, MembershipStatus

    maker = get_async_session_maker()
    try:
        async with maker() as session:
            tenant = await factories.create_tenant(session)
            workspace = await factories.create_workspace(session, tenant=tenant)
            await factories.create_membership(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=user_id,
                role=MembershipRole(role),
                status=MembershipStatus.active,
            )
            await session.commit()
            return workspace.id
    finally:
        await get_engine().dispose()
        get_async_session_maker.cache_clear()
        get_engine.cache_clear()


def test_get_connection_401_missing_authorization():
    with TestClient(app) as client:
        r = client.get(f"/workspaces/{uuid.uuid4()}/connection")
    assert r.status_code == 401
    body = r.json()
    assert body["error_code"] == "auth_required"


def test_get_connection_401_invalid_jwt(monkeypatch: pytest.MonkeyPatch):
    def boom(_token: str):
        raise InvalidJwtError("bad")

    monkeypatch.setattr("app.auth_context.dependencies.decode_supabase_jwt", boom)
    with TestClient(app) as client:
        r = client.get(
            f"/workspaces/{uuid.uuid4()}/connection",
            headers={"Authorization": "Bearer x.y.z"},
        )
    assert r.status_code == 401
    assert r.json()["error_code"] == "auth_required"


def test_get_connection_403_non_admin(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    uid = uuid.uuid4()
    workspace_id = asyncio.run(_seed_member_with_role(user_id=uid, role="viewer"))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "viewer@example.com"},
    )
    with TestClient(app) as client:
        r = client.get(
            f"/workspaces/{workspace_id}/connection",
            headers={"Authorization": "Bearer fake"},
        )
    assert r.status_code == 403
    assert r.json()["error_code"] == "authz_denied"


def test_get_connection_200_admin_not_configured(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    uid = uuid.uuid4()
    workspace_id = asyncio.run(_seed_member_with_role(user_id=uid, role="admin"))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )

    with TestClient(app) as client:
        r = client.get(
            f"/workspaces/{workspace_id}/connection",
            headers={"Authorization": "Bearer fake"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "not_configured"
    assert body["has_credentials"] is False
