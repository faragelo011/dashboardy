"""Integration tests for widget execute audit attribution (US1 / SC-008)."""

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
        column_names=["amount"],
        column_types=["INTEGER"],
        rows=[[42]],
        status=ExecutionStatus.ok,
        truncated=False,
        snowflake_wall_ms=2,
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
        "app.routes.dashboards.get_connection_service",
        lambda vault_required=True: _ConnSvc(),  # noqa: ARG005
    )


def test_widget_execute_writes_audit_log_ids(
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
        question = client.post(
            f"/workspaces/{seeded.workspace_id}/questions",
            json={
                "collection_id": str(seeded.collection_id),
                "title": "Audit KPI",
                "sql_text": "SELECT 42 AS amount",
                "parameters": [],
            },
            headers=headers,
        )
        assert question.status_code == 201, question.text
        question_id = question.json()["id"]

        created = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards",
            json={
                "collection_id": str(seeded.collection_id),
                "title": "Audit dashboard",
                "widgets": [
                    {
                        "widget_type": "kpi",
                        "saved_question_id": question_id,
                        "layout": {"x": 0, "y": 0, "w": 4, "h": 2},
                    }
                ],
            },
            headers=headers,
        )
        assert created.status_code == 201
        dashboard_id = created.json()["id"]
        widget_id = created.json()["widgets"][0]["id"]

        executed = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/execute",
            json={"global_filter_values": {}, "bypass_cache": False},
            headers=headers,
        )
    assert executed.status_code == 200, executed.text

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
    assert audit.dashboard_id == uuid.UUID(dashboard_id)
    assert audit.widget_id == uuid.UUID(widget_id)
    assert str(audit.saved_question_id) == question_id
