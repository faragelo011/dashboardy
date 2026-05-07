"""Integration coverage for US2 failed connection tests and safe categorization."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from fastapi.testclient import TestClient

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


@pytest.mark.parametrize(
    "error_message,expected_category",
    [
        ("Incorrect username or password", "credential"),
        ("Failed to connect to host", "network"),
        ("Not authorized", "permission"),
        ("Operation timed out", "timeout"),
        ("Something else", "unknown"),
    ],
)
def test_connection_test_failure_sets_test_failed_and_returns_sanitized_error(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
    error_message: str,
    expected_category: str,
):
    uid = uuid.uuid4()
    _tenant_id, workspace_id, _membership_id, _conn_id = asyncio.run(
        _seed_admin_and_connection(user_id=uid)
    )
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )

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

    async def fake_run_check(self, **kwargs) -> None:
        _ = kwargs
        raise RuntimeError(error_message)

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
    assert body["test_status"] == "failure"
    assert body["failure_category"] == expected_category
    assert body["connection"]["status"] == "test_failed"
    assert body["sanitized_error"]
    assert "vault_secret_id" not in r.text.lower()
    assert "pending_vault_secret_id" not in r.text.lower()
