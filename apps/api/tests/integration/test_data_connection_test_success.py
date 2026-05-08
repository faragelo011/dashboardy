"""Integration coverage for US2 successful connection test."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from fastapi.testclient import TestClient
from sqlalchemy import select

from tests.factories import auth_tenancy as factories


async def _seed_admin_and_connection(*, user_id: uuid.UUID):
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
                status=DbConnectionStatus.pending_test,
                pending_vault_secret_id="pending-secret",
                pending_secret_version=1,
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


def test_connection_test_success_promotes_pending_and_updates_timestamps(
    use_live_postgres: None, monkeypatch: pytest.MonkeyPatch
):
    uid = uuid.uuid4()
    tenant_id, workspace_id, _membership_id, conn_id = asyncio.run(
        _seed_admin_and_connection(user_id=uid)
    )
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )

    # Fake Vault read returns full credentials.
    async def fake_read_secret(self, *, secret_id: str) -> dict[str, str]:
        assert secret_id == "pending-secret"
        return {
            "account": "acct",
            "username": "user",
            "password": "secret",
            "role": "SYSADMIN",
        }

    monkeypatch.setattr(
        "app.connections.vault.HttpSupabaseVaultClient.read_secret",
        fake_read_secret,
    )
    monkeypatch.setenv("SUPABASE_URL", "http://supabase.local")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role")

    # Fake Snowflake tester succeeds.
    async def fake_run_check(
        self,
        *,
        account: str,
        user: str,
        password: str | None,
        private_key_pem: str | None,
        private_key_passphrase: str | None,
        warehouse: str,
        database: str,
        schema: str | None,
        role: str,
    ) -> None:
        assert password == "secret"
        assert private_key_pem is None
        assert private_key_passphrase is None
        _ = account, user, warehouse, database, schema, role
        return None

    monkeypatch.setattr(
        "app.connections.snowflake.SnowflakeConnectorTester.run_connectivity_check",
        fake_run_check,
    )

    with TestClient(app) as client:
        r = client.post(
            f"/workspaces/{workspace_id}/connection/test",
            headers={"Authorization": "Bearer t"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["test_status"] == "success"
    assert body["connection"]["status"] == "active"
    assert body["connection"]["last_tested_at"] is not None
    assert body["connection"]["last_successful_test_at"] is not None

    async def load_connection_state() -> tuple[str | None, str | None]:
        from app.db.session import get_async_session_maker, get_engine
        from app.models.data_connections import DataConnection

        get_async_session_maker.cache_clear()
        get_engine.cache_clear()
        maker = get_async_session_maker()
        try:
            async with maker() as session:
                stmt = select(DataConnection).where(
                    DataConnection.tenant_id == tenant_id,
                    DataConnection.id == conn_id,
                )
                row = (await session.execute(stmt)).scalar_one()
                return row.vault_secret_id, row.pending_vault_secret_id
        finally:
            await get_engine().dispose()
            get_async_session_maker.cache_clear()
            get_engine.cache_clear()

    vault_secret_id, pending_secret_id = asyncio.run(load_connection_state())
    assert vault_secret_id == "pending-secret"
    assert pending_secret_id is None


def test_connection_test_success_with_private_key_pem(
    use_live_postgres: None, monkeypatch: pytest.MonkeyPatch
):
    uid = uuid.uuid4()
    tenant_id, workspace_id, _membership_id, conn_id = asyncio.run(
        _seed_admin_and_connection(user_id=uid)
    )
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )

    pem = (
        "-----BEGIN PRIVATE KEY-----\n"
        "MC4CAQAwBQYDK2VwBCIEILmHj2YqZbZwMfZy0wvhO/tm5r\n"
        "-----END PRIVATE KEY-----\n"
    )

    async def fake_read_secret(self, *, secret_id: str) -> dict[str, str]:
        assert secret_id == "pending-secret"
        return {
            "account": "acct",
            "username": "user",
            "private_key_pem": pem,
            "role": "SYSADMIN",
        }

    monkeypatch.setattr(
        "app.connections.vault.HttpSupabaseVaultClient.read_secret",
        fake_read_secret,
    )
    monkeypatch.setenv("SUPABASE_URL", "http://supabase.local")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role")

    async def fake_run_check(
        self,
        *,
        account: str,
        user: str,
        password: str | None,
        private_key_pem: str | None,
        private_key_passphrase: str | None,
        warehouse: str,
        database: str,
        schema: str | None,
        role: str,
    ) -> None:
        assert password is None
        # Service normalizes PEM with `.strip()` before calling Snowflake.
        assert private_key_pem == pem.strip()
        assert private_key_passphrase is None
        _ = account, user, warehouse, database, schema, role
        return None

    monkeypatch.setattr(
        "app.connections.snowflake.SnowflakeConnectorTester.run_connectivity_check",
        fake_run_check,
    )

    with TestClient(app) as client:
        r = client.post(
            f"/workspaces/{workspace_id}/connection/test",
            headers={"Authorization": "Bearer t"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["test_status"] == "success"
    assert body["connection"]["status"] == "active"

    async def load_connection_state() -> tuple[str | None, str | None]:
        from app.db.session import get_async_session_maker, get_engine
        from app.models.data_connections import DataConnection

        get_async_session_maker.cache_clear()
        get_engine.cache_clear()
        maker = get_async_session_maker()
        try:
            async with maker() as session:
                stmt = select(DataConnection).where(
                    DataConnection.tenant_id == tenant_id,
                    DataConnection.id == conn_id,
                )
                row = (await session.execute(stmt)).scalar_one()
                return row.vault_secret_id, row.pending_vault_secret_id
        finally:
            await get_engine().dispose()
            get_async_session_maker.cache_clear()
            get_engine.cache_clear()

    vault_secret_id, pending_secret_id = asyncio.run(load_connection_state())
    assert vault_secret_id == "pending-secret"
    assert pending_secret_id is None
