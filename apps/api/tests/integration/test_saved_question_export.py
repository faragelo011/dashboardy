"""Integration tests for saved-question CSV export (US4)."""

from __future__ import annotations

import asyncio
import uuid
from types import SimpleNamespace

import pytest
from app.main import app
from app.models.query_engine import QueryAuditLog
from app.query_engine.enums import ExecutionStatus
from app.query_engine.snowflake_run import SnowflakeSelectOutcome
from fastapi.testclient import TestClient
from sqlalchemy import select

from tests.saved_questions_fixtures import seed_question_catalog


def _snowflake_ok() -> SnowflakeSelectOutcome:
    return SnowflakeSelectOutcome(
        column_names=["region"],
        column_types=["STRING"],
        rows=[["EMEA"]],
        status=ExecutionStatus.ok,
        truncated=False,
        snowflake_wall_ms=1,
        bytes_scanned=None,
        message=None,
    )


def _patch_execute(monkeypatch: pytest.MonkeyPatch, connection_id: uuid.UUID) -> None:
    async def _sf(*_a, **_k):
        return _snowflake_ok()

    monkeypatch.setattr("app.query_engine.pipeline.execute_snowflake_select", _sf)
    conn_stub = SimpleNamespace(id=connection_id, secret_version=1)

    class _ConnSvc:
        async def resolve_active_execution_credentials(
            self, *, session, tenant_id
        ):  # noqa: ARG002
            creds = {
                "account": "a",
                "username": "u",
                "password": "p",
                "role": "r",
            }
            return conn_stub, creds

    monkeypatch.setattr(
        "app.routes.questions.get_connection_service",
        lambda vault_required=True: _ConnSvc(),  # noqa: ARG005
    )


@pytest.mark.parametrize(
    ("user_id_attr", "email"),
    [
        ("admin_user_id", "admin@example.com"),
        ("analyst_user_id", "analyst@example.com"),
        ("viewer_user_id", "viewer@example.com"),
    ],
)
def test_internal_roles_can_export_visible_question(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
    user_id_attr: str,
    email: str,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    user_id = getattr(seeded, user_id_attr)
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(user_id), "email": email},
    )
    _patch_execute(monkeypatch, seeded.connection_id)
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        exported = client.get(
            f"/workspaces/{seeded.workspace_id}/questions/{seeded.question_id}/export.csv",
            params={"parameters[region]": "EMEA"},
            headers=headers,
        )

    assert exported.status_code == 200
    assert exported.headers["content-type"].startswith("text/csv")
    assert exported.text.splitlines()[0] == "region"


def test_external_client_without_export_grant_is_forbidden(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog(grant_external_export=False))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.external_user_id), "email": "client@example.com"},
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        exported = client.get(
            f"/workspaces/{seeded.workspace_id}/questions/{seeded.question_id}/export.csv",
            params={"parameters[region]": "EMEA"},
            headers=headers,
        )

    assert exported.status_code == 403
    assert exported.json()["error_code"] == "export_not_permitted"


def test_external_client_with_export_grant_receives_csv(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog(grant_external_export=True))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.external_user_id), "email": "client@example.com"},
    )
    _patch_execute(monkeypatch, seeded.connection_id)
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        exported = client.get(
            f"/workspaces/{seeded.workspace_id}/questions/{seeded.question_id}/export.csv",
            params={"parameters[region]": "EMEA"},
            headers=headers,
        )

    assert exported.status_code == 200
    assert exported.headers["content-type"].startswith("text/csv")


def test_export_writes_audit_log_with_saved_question_id(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.admin_user_id), "email": "admin@example.com"},
    )
    _patch_execute(monkeypatch, seeded.connection_id)
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        exported = client.get(
            f"/workspaces/{seeded.workspace_id}/questions/{seeded.question_id}/export.csv",
            params={"parameters[region]": "NA"},
            headers=headers,
        )
    assert exported.status_code == 200

    async def _latest_audit() -> QueryAuditLog:
        from app.db.session import get_async_session_maker, get_engine

        get_engine.cache_clear()
        get_async_session_maker.cache_clear()
        maker = get_async_session_maker()
        async with maker() as session:
            stmt = (
                select(QueryAuditLog)
                .where(QueryAuditLog.tenant_id == seeded.tenant_id)
                .order_by(QueryAuditLog.created_at.desc())
                .limit(1)
            )
            return (await session.execute(stmt)).scalar_one()

    audit = asyncio.run(_latest_audit())
    assert audit.saved_question_id == seeded.question_id


def test_export_invalid_parameters_returns_json_not_csv(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.viewer_user_id), "email": "viewer@example.com"},
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        exported = client.get(
            f"/workspaces/{seeded.workspace_id}/questions/{seeded.question_id}/export.csv",
            params={"parameters[region]": "EMEA", "parameters[extra]": "x"},
            headers=headers,
        )

    assert exported.status_code == 422
    assert exported.json()["error_code"] == "invalid_parameters"
    assert "application/json" in exported.headers.get("content-type", "")
