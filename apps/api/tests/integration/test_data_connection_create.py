"""Integration coverage for User Story 1 create/update connection endpoints."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from fastapi.testclient import TestClient

from tests.factories import auth_tenancy as factories


async def _seed_workspace_member(*, user_id: uuid.UUID, role: str):
    from app.db.session import get_async_session_maker, get_engine
    from app.models.auth_tenancy import MembershipRole, MembershipStatus

    maker = get_async_session_maker()
    try:
        async with maker() as session:
            tenant = await factories.create_tenant(session)
            workspace = await factories.create_workspace(session, tenant=tenant)
            membership = await factories.create_membership(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=user_id,
                role=MembershipRole(role),
                status=MembershipStatus.active,
            )
            await session.commit()
            return tenant.id, workspace.id, membership.id
    finally:
        await get_engine().dispose()
        get_async_session_maker.cache_clear()
        get_engine.cache_clear()


def test_get_connection_empty_state_not_configured(
    use_live_postgres: None, monkeypatch: pytest.MonkeyPatch
):
    uid = uuid.uuid4()
    _tenant_id, workspace_id, _membership_id = asyncio.run(
        _seed_workspace_member(user_id=uid, role="admin")
    )
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )
    with TestClient(app) as client:
        r = client.get(
            f"/workspaces/{workspace_id}/connection",
            headers={"Authorization": "Bearer t"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "not_configured"
    assert body["has_credentials"] is False


def test_admin_can_create_then_update_metadata_single_connection_per_tenant(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    uid = uuid.uuid4()
    tenant_id, workspace_id, _membership_id = asyncio.run(
        _seed_workspace_member(user_id=uid, role="admin")
    )
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )

    # Prevent real outbound Vault calls.
    async def fake_store_secret(
        self, *, name: str, secret_payload: dict[str, str]
    ) -> str:
        assert "password" in secret_payload
        return "vault-secret-opaque-id"

    monkeypatch.setattr(
        "app.connections.vault.HttpSupabaseVaultClient.store_secret",
        fake_store_secret,
    )
    monkeypatch.setenv("SUPABASE_URL", "http://supabase.local")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role")

    with TestClient(app) as client:
        r1 = client.put(
            f"/workspaces/{workspace_id}/connection",
            headers={"Authorization": "Bearer t"},
            json={
                "name": "Acme Snowflake",
                "warehouse": "WH",
                "database": "DB",
                "schema": "PUBLIC",
                "credentials": {
                    "account": "acct",
                    "username": "user",
                    "password": "supersecret",
                    "role": "SYSADMIN",
                },
            },
        )
        assert r1.status_code == 201
        body1 = r1.json()
        assert body1["status"] == "pending_test"
        assert body1["has_credentials"] is True
        assert "password" not in str(body1).lower()
        created_id = body1.get("id")
        assert created_id, "expected connection id in response"

        # Metadata-only update should return 200 and keep one row.
        r2 = client.put(
            f"/workspaces/{workspace_id}/connection",
            headers={"Authorization": "Bearer t"},
            json={
                "name": "Acme Snowflake Updated",
                "warehouse": "WH2",
                "database": "DB2",
                "schema": None,
            },
        )
        assert r2.status_code == 200
        body2 = r2.json()
        assert body2["name"] == "Acme Snowflake Updated"
        assert body2["warehouse"] == "WH2"
        assert body2["database"] == "DB2"
        assert body2.get("id") == created_id
        # Further sanity: the GET endpoint should return the same id.
        r3 = client.get(
            f"/workspaces/{workspace_id}/connection",
            headers={"Authorization": "Bearer t"},
        )
        assert r3.status_code == 200
        assert r3.json().get("id") == created_id


def test_non_admin_denied_put_connection(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    uid = uuid.uuid4()
    _tenant_id, workspace_id, _membership_id = asyncio.run(
        _seed_workspace_member(user_id=uid, role="viewer")
    )
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "viewer@example.com"},
    )
    with TestClient(app) as client:
        r = client.put(
            f"/workspaces/{workspace_id}/connection",
            headers={"Authorization": "Bearer t"},
            json={
                "name": "Acme Snowflake",
                "warehouse": "WH",
                "database": "DB",
            },
        )
    assert r.status_code == 403
    assert r.json()["error_code"] == "authz_denied"
