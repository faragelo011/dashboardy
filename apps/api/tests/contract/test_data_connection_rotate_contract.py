"""Contract checks for POST /workspaces/{workspace_id}/connection/rotate."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from fastapi.testclient import TestClient

from tests.factories import auth_tenancy as factories


async def _seed_member(*, user_id: uuid.UUID, role: str) -> uuid.UUID:
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


def test_rotate_401_missing_auth():
    with TestClient(app) as client:
        r = client.post(f"/workspaces/{uuid.uuid4()}/connection/rotate", json={})
    assert r.status_code == 401
    assert r.json()["error_code"] == "auth_required"


def test_rotate_403_non_admin(use_live_postgres: None, monkeypatch: pytest.MonkeyPatch):
    uid = uuid.uuid4()
    workspace_id = asyncio.run(_seed_member(user_id=uid, role="viewer"))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "viewer@example.com"},
    )
    with TestClient(app) as client:
        r = client.post(
            f"/workspaces/{workspace_id}/connection/rotate",
            headers={"Authorization": "Bearer t"},
            json={
                "credentials": {
                    "account": "acct",
                    "username": "user",
                    "password": "pw",
                    "role": "SYSADMIN",
                }
            },
        )
    assert r.status_code == 403
    assert r.json()["error_code"] == "authz_denied"


def test_rotate_404_when_not_configured(
    use_live_postgres: None, monkeypatch: pytest.MonkeyPatch
):
    uid = uuid.uuid4()
    workspace_id = asyncio.run(_seed_member(user_id=uid, role="admin"))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )
    with TestClient(app) as client:
        r = client.post(
            f"/workspaces/{workspace_id}/connection/rotate",
            headers={"Authorization": "Bearer t"},
            json={
                "credentials": {
                    "account": "acct",
                    "username": "user",
                    "password": "pw",
                    "role": "SYSADMIN",
                }
            },
        )
    assert r.status_code == 404
    assert r.json()["error_code"] == "connection_not_found"


def test_rotate_200_shape(monkeypatch: pytest.MonkeyPatch, use_live_postgres: None):
    uid = uuid.uuid4()
    workspace_id = asyncio.run(_seed_member(user_id=uid, role="admin"))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )

    from app.connections.schemas import DataConnectionResponse

    async def fake_rotate(*, session, actor, payload):
        _ = session, actor, payload
        return DataConnectionResponse(status="pending_test", has_credentials=True)

    monkeypatch.setattr(
        "app.connections.service.ConnectionService.rotate_credentials",
        staticmethod(fake_rotate),
    )

    with TestClient(app) as client:
        r = client.post(
            f"/workspaces/{workspace_id}/connection/rotate",
            headers={"Authorization": "Bearer t"},
            json={
                "credentials": {
                    "account": "acct",
                    "username": "user",
                    "password": "pw",
                    "role": "SYSADMIN",
                }
            },
        )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "pending_test"

