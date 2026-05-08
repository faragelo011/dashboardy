"""Integration coverage for failed rotation preserving effective credentials."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from fastapi.testclient import TestClient

from tests.factories import auth_tenancy as factories


async def _seed_admin_and_active_connection(*, user_id: uuid.UUID):
    from app.db.session import get_async_session_maker, get_engine
    from app.models.auth_tenancy import MembershipRole, MembershipStatus
    from app.models.data_connections import DataConnection, DbConnectionStatus

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
                role=MembershipRole.admin,
                status=MembershipStatus.active,
            )
            conn = DataConnection(
                tenant_id=tenant.id,
                name="Acme Snowflake",
                warehouse="WH",
                database="DB",
                schema_=None,
                status=DbConnectionStatus.active,
                vault_secret_id="effective-secret",
                secret_version=1,
                created_by_membership_id=membership.id,
                updated_by_membership_id=membership.id,
            )
            session.add(conn)
            await session.commit()
            return tenant.id, workspace.id, membership.id, conn.id
    finally:
        await get_engine().dispose()
        get_async_session_maker.cache_clear()
        get_engine.cache_clear()


def test_failed_rotation_test_does_not_change_effective_secret_version(
    use_live_postgres: None, monkeypatch: pytest.MonkeyPatch
):
    uid = uuid.uuid4()
    _tenant_id, workspace_id, _membership_id, _conn_id = asyncio.run(
        _seed_admin_and_active_connection(user_id=uid)
    )
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )

    async def fake_store_secret(
        self, *, name: str, secret_payload: dict[str, str]
    ) -> str:
        _ = name, secret_payload
        return "pending-secret"

    async def fake_read_secret(self, *, secret_id: str) -> dict[str, str]:
        assert secret_id in ("pending-secret", "effective-secret")
        return {
            "account": "acct",
            "username": "user",
            "password": "secret",
            "role": "SYSADMIN",
        }

    monkeypatch.setattr(
        "app.connections.vault.HttpSupabaseVaultClient.store_secret",
        fake_store_secret,
    )
    monkeypatch.setattr(
        "app.connections.vault.HttpSupabaseVaultClient.read_secret",
        fake_read_secret,
    )
    monkeypatch.setenv("SUPABASE_URL", "http://supabase.local")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role")

    async def fake_run_check(self, **kwargs) -> None:
        _ = kwargs
        raise RuntimeError("Incorrect username or password")

    monkeypatch.setattr(
        "app.connections.snowflake.SnowflakeConnectorTester.run_connectivity_check",
        fake_run_check,
    )

    with TestClient(app) as client:
        r1 = client.post(
            f"/workspaces/{workspace_id}/connection/rotate",
            headers={"Authorization": "Bearer t"},
            json={
                "credentials": {
                    "account": "acct",
                    "username": "user",
                    "password": "newsecret",
                    "role": "SYSADMIN",
                }
            },
        )
        assert r1.status_code == 200
        assert r1.json()["status"] == "pending_test"

        r2 = client.post(
            f"/workspaces/{workspace_id}/connection/test",
            headers={"Authorization": "Bearer t"},
        )
        assert r2.status_code == 200
        body2 = r2.json()
        assert body2["test_status"] == "failure"
        # Effective secret_version must remain unchanged.
        assert body2["connection"]["secret_version"] == 1
        assert body2["connection"]["status"] == "test_failed"

