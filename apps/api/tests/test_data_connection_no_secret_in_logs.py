"""Regression: credential values from HTTP bodies must not appear in emitted logs."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from fastapi.testclient import TestClient

from tests.factories import auth_tenancy as factories


async def _seed_admin(*, user_id: uuid.UUID):
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
            return tenant.id, workspace.id
    finally:
        await get_engine().dispose()
        get_async_session_maker.cache_clear()
        get_engine.cache_clear()


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
            return tenant.id, workspace.id
    finally:
        await get_engine().dispose()
        get_async_session_maker.cache_clear()
        get_engine.cache_clear()


def test_put_credentials_password_absent_from_captured_logs(
    use_live_postgres: None,  # noqa: ARG001
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
):
    uid = uuid.uuid4()
    _tenant_id, workspace_id = asyncio.run(_seed_admin(user_id=uid))
    probe_pw = f"dc-log-probe-put-{uuid.uuid4().hex}"

    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )

    async def fake_store_secret(
        self, *, name: str, secret_payload: dict[str, str]
    ) -> str:
        _ = name
        assert secret_payload["password"] == probe_pw
        return "vault-opaque-id"

    monkeypatch.setattr(
        "app.connections.vault.HttpSupabaseVaultClient.store_secret",
        fake_store_secret,
    )
    monkeypatch.setenv("SUPABASE_URL", "http://supabase.local")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role")

    capsys.readouterr()
    with TestClient(app) as client:
        r = client.put(
            f"/workspaces/{workspace_id}/connection",
            headers={"Authorization": "Bearer t"},
            json={
                "name": "Log Probe",
                "warehouse": "W",
                "database": "D",
                "credentials": {
                    "account": "acct",
                    "username": "user",
                    "password": probe_pw,
                    "role": "r",
                },
            },
        )
        assert r.status_code in (200, 201), r.text

    out = capsys.readouterr()
    blob = out.out + out.err
    assert probe_pw not in blob


def test_rotate_credentials_password_absent_from_captured_logs(
    use_live_postgres: None,  # noqa: ARG001
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
):
    uid = uuid.uuid4()
    _tenant_id, workspace_id = asyncio.run(
        _seed_admin_and_active_connection(user_id=uid)
    )
    rotated_pw = f"dc-log-probe-rot-{uuid.uuid4().hex}"

    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )

    stored_payloads: list[dict[str, str]] = []

    async def fake_store_secret(
        self, *, name: str, secret_payload: dict[str, str]
    ) -> str:
        _ = name
        stored_payloads.append(dict(secret_payload))
        return str(uuid.uuid4())

    async def fake_read_secret(self, *, secret_id: str) -> dict[str, str]:
        _ = secret_id
        return {
            "account": "acct",
            "username": "user",
            "password": "vault-stored-non-probe",
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

    capsys.readouterr()
    with TestClient(app) as client:
        r = client.post(
            f"/workspaces/{workspace_id}/connection/rotate",
            headers={"Authorization": "Bearer t"},
            json={
                "credentials": {
                    "account": "acct",
                    "username": "user",
                    "password": rotated_pw,
                    "role": "SYSADMIN",
                }
            },
        )
        assert r.status_code == 200, r.text

    out = capsys.readouterr()
    blob = out.out + out.err
    assert rotated_pw not in blob
    assert any(rotated_pw == p.get("password") for p in stored_payloads)


def test_put_credentials_pem_and_passphrase_markers_absent_from_captured_logs(
    use_live_postgres: None,  # noqa: ARG001
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
):
    uid = uuid.uuid4()
    _tenant_id, workspace_id = asyncio.run(_seed_admin(user_id=uid))
    pem_marker = f"dc-log-probe-pem-{uuid.uuid4().hex}"
    passphrase_marker = f"dc-log-probe-pp-{uuid.uuid4().hex}"
    faux_pem = f"-----BEGIN PRIVATE KEY-----\n{pem_marker}\n-----END PRIVATE KEY-----"

    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(uid), "email": "admin@example.com"},
    )

    async def fake_store_secret(
        self, *, name: str, secret_payload: dict[str, str]
    ) -> str:
        _ = name
        assert pem_marker in secret_payload.get("private_key_pem", "")
        assert secret_payload.get("private_key_passphrase") == passphrase_marker
        return "vault-opaque-id"

    monkeypatch.setattr(
        "app.connections.vault.HttpSupabaseVaultClient.store_secret",
        fake_store_secret,
    )
    monkeypatch.setenv("SUPABASE_URL", "http://supabase.local")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role")

    capsys.readouterr()
    with TestClient(app) as client:
        r = client.put(
            f"/workspaces/{workspace_id}/connection",
            headers={"Authorization": "Bearer t"},
            json={
                "name": "PEM Probe",
                "warehouse": "W",
                "database": "D",
                "credentials": {
                    "account": "acct",
                    "username": "user",
                    "role": "r",
                    "private_key_pem": faux_pem,
                    "private_key_passphrase": passphrase_marker,
                },
            },
        )
        assert r.status_code in (200, 201), r.text

    out = capsys.readouterr()
    blob = out.out + out.err
    assert pem_marker not in blob
    assert passphrase_marker not in blob
