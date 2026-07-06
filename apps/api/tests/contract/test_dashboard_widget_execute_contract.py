"""Contract checks for dashboard widget execute (Feature 006 US2)."""

from __future__ import annotations

import asyncio
import uuid
from types import SimpleNamespace

import pytest
from app.main import app
from app.query_engine.enums import ExecutionStatus
from app.query_engine.snowflake_run import SnowflakeSelectOutcome
from fastapi.testclient import TestClient

from tests.saved_questions_fixtures import seed_question_catalog


def _snowflake_ok() -> SnowflakeSelectOutcome:
    return SnowflakeSelectOutcome(
        column_names=["amount"],
        column_types=["INTEGER"],
        rows=[[99]],
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


def test_widget_execute_contract_with_global_filter_values(
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
        created = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards",
            json={
                "collection_id": str(seeded.collection_id),
                "title": "Filter contract dashboard",
                "definition": {
                    "layout_version": 1,
                    "global_filters": [
                        {
                            "id": "gf_region",
                            "label": "Region",
                            "value_type": "string",
                            "default_value": "EMEA",
                        }
                    ],
                },
                "widgets": [
                    {
                        "widget_type": "kpi",
                        "saved_question_id": str(seeded.question_id),
                        "layout": {"x": 0, "y": 0, "w": 4, "h": 2},
                        "filter_bindings": {"gf_region": "region"},
                    }
                ],
            },
            headers=headers,
        )
        assert created.status_code == 201, created.text
        dashboard_id = created.json()["id"]
        widget_id = created.json()["widgets"][0]["id"]

        executed = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/execute",
            json={
                "global_filter_values": {"gf_region": "NA"},
                "bypass_cache": False,
            },
            headers=headers,
        )
    assert executed.status_code == 200, executed.text
    body = executed.json()
    for key in ("columns", "rows", "meta"):
        assert key in body
    assert body["meta"]["status"] == "ok"
    assert isinstance(body["meta"]["cache_hit"], bool)
    assert body["meta"]["row_count"] >= 0


def test_widget_execute_rejects_unknown_global_filter_value_id(
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
        created = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards",
            json={
                "collection_id": str(seeded.collection_id),
                "title": "Bad filter values",
                "widgets": [
                    {
                        "widget_type": "kpi",
                        "saved_question_id": str(seeded.question_id),
                        "layout": {"x": 0, "y": 0, "w": 4, "h": 2},
                    }
                ],
            },
            headers=headers,
        )
        dashboard_id = created.json()["id"]
        widget_id = created.json()["widgets"][0]["id"]

        rejected = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/execute",
            json={"global_filter_values": {"gf_unknown": "x"}},
            headers=headers,
        )
    assert rejected.status_code == 422
    assert rejected.json()["error_code"] == "invalid_filter_bindings"
