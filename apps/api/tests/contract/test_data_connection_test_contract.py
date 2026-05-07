"""Contract checks for POST /workspaces/{workspace_id}/connection/test."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from fastapi.testclient import TestClient

from tests.factories import auth_tenancy as factories


async def _seed_admin(*, user_id: uuid.UUID) -> uuid.UUID:
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
                role=MembershipRole.admin,
                status=MembershipStatus.active,
            )
            await session.commit()
            return workspace.id
    finally:
        await get_engine().dispose()
        get_async_session_maker.cache_clear()
        get_engine.cache_clear()


def test_test_connection_401_missing_auth():
    with TestClient(app) as client:
        r = client.post(f"/workspaces/{uuid.uuid4()}/connection/test")
    assert r.status_code == 401
    assert r.json()["error_code"] == "auth_required"


def test_test_connection_200_success_shape(
    use_live_postgres: None, monkeypatch: pytest.MonkeyPatch
):
    uid = uuid.uuid4()
    workspace_id = asyncio.run(_seed_admin(user_id=uid))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )

    # Force service behavior without hitting external deps.
    from app.connections.schemas import ConnectionTestResponse, DataConnectionResponse

    async def fake_test_connection(*, session, actor):
        _ = session, actor
        return ConnectionTestResponse(
            connection=DataConnectionResponse(status="active", has_credentials=True),
            test_status="success",
        )

    monkeypatch.setattr(
        "app.connections.service.ConnectionService.test_connection",
        staticmethod(fake_test_connection),
    )

    with TestClient(app) as client:
        r = client.post(
            f"/workspaces/{workspace_id}/connection/test",
            headers={"Authorization": "Bearer t"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["test_status"] == "success"
    assert "connection" in body


def test_test_connection_200_failure_shape(
    use_live_postgres: None, monkeypatch: pytest.MonkeyPatch
):
    uid = uuid.uuid4()
    workspace_id = asyncio.run(_seed_admin(user_id=uid))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )

    from app.connections.schemas import ConnectionTestResponse, DataConnectionResponse

    async def fake_test_connection(*, session, actor):
        _ = session, actor
        return ConnectionTestResponse(
            connection=DataConnectionResponse(
                status="test_failed", has_credentials=True
            ),
            test_status="failure",
            failure_category="credential",
            sanitized_error="Invalid password",
        )

    monkeypatch.setattr(
        "app.connections.service.ConnectionService.test_connection",
        staticmethod(fake_test_connection),
    )

    with TestClient(app) as client:
        r = client.post(
            f"/workspaces/{workspace_id}/connection/test",
            headers={"Authorization": "Bearer t"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["test_status"] == "failure"
    assert body["failure_category"] in (
        "credential",
        "network",
        "permission",
        "timeout",
        "unknown",
    )
    assert "sanitized_error" in body
