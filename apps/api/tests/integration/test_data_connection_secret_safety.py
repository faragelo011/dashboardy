"""Integration checks for 'no secrets outside Vault' requirements (US1)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from app.models.data_connections import (
    ConnectionManagementAuditRecord,
    DbAuditAction,
    DbAuditOutcome,
)
from fastapi.testclient import TestClient
from sqlalchemy import select

from tests.factories import auth_tenancy as factories


async def _seed_admin(*, user_id: uuid.UUID):
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
                role=MembershipRole.admin,
                status=MembershipStatus.active,
            )
            await session.commit()
            return tenant.id, workspace.id, membership.id
    finally:
        await get_engine().dispose()
        get_async_session_maker.cache_clear()
        get_engine.cache_clear()


def test_upsert_response_and_db_do_not_contain_plaintext_credentials(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    uid = uuid.uuid4()
    tenant_id, workspace_id, _membership_id = asyncio.run(_seed_admin(user_id=uid))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )

    raw_password = "supersecret-password"

    async def fake_store_secret(
        self, *, name: str, secret_payload: dict[str, str]
    ) -> str:
        # Ensure Vault sees the secret payload; app must not persist it.
        assert secret_payload["password"] == raw_password
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
            headers={"Authorization": "Bearer t"},
            json={
                "name": "Acme Snowflake",
                "warehouse": "WH",
                "database": "DB",
                "credentials": {
                    "account": "acct",
                    "username": "user",
                    "password": raw_password,
                    "role": "SYSADMIN",
                },
            },
        )
        assert r.status_code == 201
        body_text = r.text.lower()
        assert raw_password.lower() not in body_text
        assert "vault_secret_id" not in body_text
        assert "pending_vault_secret_id" not in body_text

        # GET response should remain secret-free as well.
        r2 = client.get(
            f"/workspaces/{workspace_id}/connection",
            headers={"Authorization": "Bearer t"},
        )
        assert r2.status_code == 200
        safe_text = r2.text.lower()
        assert raw_password.lower() not in safe_text
        assert "vault_secret_id" not in safe_text
        assert "pending_vault_secret_id" not in safe_text


def test_vault_failure_persists_secret_free_audit(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
):
    uid = uuid.uuid4()
    tenant_id, workspace_id, _membership_id = asyncio.run(_seed_admin(user_id=uid))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )
    monkeypatch.setenv("SUPABASE_URL", "")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "")

    with TestClient(app) as client:
        r = client.put(
            f"/workspaces/{workspace_id}/connection",
            headers={"Authorization": "Bearer t"},
            json={
                "name": "Acme Snowflake",
                "warehouse": "WH",
                "database": "DB",
                "credentials": {
                    "account": "acct",
                    "username": "user",
                    "password": "supersecret-password",
                    "role": "SYSADMIN",
                },
            },
        )
    assert r.status_code == 503

    async def audit_messages() -> list[str | None]:
        from app.db.session import get_async_session_maker, get_engine

        get_async_session_maker.cache_clear()
        get_engine.cache_clear()
        maker = get_async_session_maker()
        try:
            async with maker() as session:
                stmt = select(ConnectionManagementAuditRecord).where(
                    ConnectionManagementAuditRecord.tenant_id == tenant_id,
                    ConnectionManagementAuditRecord.action == DbAuditAction.create,
                    ConnectionManagementAuditRecord.outcome == DbAuditOutcome.failure,
                )
                rows = (await session.execute(stmt)).scalars().all()
                return [row.sanitized_message for row in rows]
        finally:
            await get_engine().dispose()
            get_async_session_maker.cache_clear()
            get_engine.cache_clear()

    messages = asyncio.run(audit_messages())
    assert messages
    assert "supersecret-password" not in str(messages)
