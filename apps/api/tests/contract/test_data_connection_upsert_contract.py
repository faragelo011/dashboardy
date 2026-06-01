"""Contract checks for PUT /workspaces/{workspace_id}/connection."""

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


def test_put_connection_401_missing_authorization():
    with TestClient(app) as client:
        r = client.put(f"/workspaces/{uuid.uuid4()}/connection", json={})
    assert r.status_code == 401
    assert r.json()["error_code"] == "auth_required"


def test_put_connection_403_non_admin(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    uid = uuid.uuid4()
    workspace_id = asyncio.run(_seed_member(user_id=uid, role="viewer"))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "viewer@example.com"},
    )
    with TestClient(app) as client:
        r = client.put(
            f"/workspaces/{workspace_id}/connection",
            headers={"Authorization": "Bearer fake"},
            json={
                "name": "Acme Snowflake",
                "warehouse": "WH",
                "database": "DB",
                "schema": "PUBLIC",
            },
        )
    assert r.status_code == 403
    assert r.json()["error_code"] == "authz_denied"


def test_put_connection_400_validation(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    uid = uuid.uuid4()
    workspace_id = asyncio.run(_seed_member(user_id=uid, role="admin"))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )
    with TestClient(app) as client:
        r = client.put(
            f"/workspaces/{workspace_id}/connection",
            headers={"Authorization": "Bearer fake"},
            json={"name": "", "warehouse": " ", "database": ""},
        )
    assert r.status_code == 400


def test_put_connection_400_empty_credentials(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    uid = uuid.uuid4()
    workspace_id = asyncio.run(_seed_member(user_id=uid, role="admin"))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )
    with TestClient(app) as client:
        r = client.put(
            f"/workspaces/{workspace_id}/connection",
            headers={"Authorization": "Bearer fake"},
            json={
                "name": "Acme Snowflake",
                "warehouse": "WH",
                "database": "DB",
                "credentials": {
                    "account": "",
                    "username": "user",
                    "password": "",
                    "role": "SYSADMIN",
                },
            },
        )
    assert r.status_code == 400


@pytest.mark.parametrize(
    "credentials",
    [
        {
            "account": "acct",
            "username": "user",
            "role": "SYSADMIN",
        },
        {
            "account": "acct",
            "username": "user",
            "password": "secret",
            "private_key_pem": (
                "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----"
            ),
            "role": "SYSADMIN",
        },
        {
            "account": "acct",
            "username": "user",
            "private_key_passphrase": "passphrase",
            "role": "SYSADMIN",
        },
    ],
)
def test_put_connection_400_invalid_credential_auth_shape(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
    credentials: dict[str, str],
):
    uid = uuid.uuid4()
    workspace_id = asyncio.run(_seed_member(user_id=uid, role="admin"))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )
    with TestClient(app) as client:
        r = client.put(
            f"/workspaces/{workspace_id}/connection",
            headers={"Authorization": "Bearer fake"},
            json={
                "name": "Acme Snowflake",
                "warehouse": "WH",
                "database": "DB",
                "credentials": credentials,
            },
        )
    assert r.status_code == 400
    body = r.json()
    assert body["error_code"] == "validation_error"
    assert "secret" not in str(body).lower()


def test_put_connection_503_when_vault_missing_config(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    uid = uuid.uuid4()
    workspace_id = asyncio.run(_seed_member(user_id=uid, role="admin"))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )
    monkeypatch.setenv("SUPABASE_URL", "")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "")
    with TestClient(app) as client:
        r = client.put(
            f"/workspaces/{workspace_id}/connection",
            headers={"Authorization": "Bearer fake"},
            json={
                "name": "Acme Snowflake",
                "warehouse": "WH",
                "database": "DB",
                "credentials": {
                    "account": "acct",
                    "username": "user",
                    "password": "secret",
                    "role": "SYSADMIN",
                },
            },
        )
    assert r.status_code == 503
    assert r.json()["error_code"] == "dependency_unavailable"


def test_put_connection_201_create_with_credentials(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    uid = uuid.uuid4()
    workspace_id = asyncio.run(_seed_member(user_id=uid, role="admin"))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )

    async def fake_store_secret(
        self, *, name: str, secret_payload: dict[str, str]
    ) -> str:
        return "vault-secret-opaque-id"

    monkeypatch.setattr(
        "app.connections.vault.HttpSupabaseVaultClient.store_secret",
        fake_store_secret,
    )
    monkeypatch.setenv("SUPABASE_URL", "http://supabase.local")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role")

    with TestClient(app) as client:
        r = client.put(
            f"/workspaces/{workspace_id}/connection",
            headers={"Authorization": "Bearer fake"},
            json={
                "name": "Acme Snowflake",
                "warehouse": "WH",
                "database": "DB",
                "credentials": {
                    "account": "acct",
                    "username": "user",
                    "password": "secret",
                    "role": "SYSADMIN",
                },
            },
        )
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "pending_test"
    assert body["has_credentials"] is True


def test_put_connection_409_conflict_surface(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    uid = uuid.uuid4()
    workspace_id = asyncio.run(_seed_member(user_id=uid, role="admin"))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )

    async def fake_get_connection_for_tenant(*args, **kwargs):
        return None

    async def fake_create_connection(*args, **kwargs):
        from app.connections.errors import ConnectionConflictError

        raise ConnectionConflictError("Connection already exists for this tenant.")

    monkeypatch.setattr(
        "app.connections.repository.get_connection_for_tenant",
        fake_get_connection_for_tenant,
    )
    monkeypatch.setattr(
        "app.connections.repository.create_connection",
        fake_create_connection,
    )

    with TestClient(app) as client:
        r = client.put(
            f"/workspaces/{workspace_id}/connection",
            headers={"Authorization": "Bearer fake"},
            json={
                "name": "Acme Snowflake",
                "warehouse": "WH",
                "database": "DB",
            },
        )
    assert r.status_code == 409
    assert r.json()["error_code"] == "connection_conflict"
