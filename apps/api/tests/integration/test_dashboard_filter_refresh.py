"""Integration tests for dashboard global filter refresh (US2)."""

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
        rows=[[7]],
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


def _create_filter_dashboard(
    client: TestClient,
    *,
    workspace_id: uuid.UUID,
    seeded,
    headers: dict[str, str],
) -> tuple[str, str, str]:
    unbound_question = client.post(
        f"/workspaces/{workspace_id}/questions",
        json={
            "collection_id": str(seeded.collection_id),
            "title": "Unbound KPI",
            "sql_text": "SELECT 1 AS amount",
            "parameters": [],
        },
        headers=headers,
    )
    assert unbound_question.status_code == 201, unbound_question.text
    unbound_question_id = unbound_question.json()["id"]

    created = client.post(
        f"/workspaces/{workspace_id}/dashboards",
        json={
            "collection_id": str(seeded.collection_id),
            "title": "Filter refresh dashboard",
            "definition": {
                "layout_version": 1,
                "global_filters": [
                    {
                        "id": "gf_region",
                        "label": "Region",
                        "value_type": "string",
                        "default_value": "EMEA",
                    },
                    {
                        "id": "gf_unused",
                        "label": "Unused",
                        "value_type": "string",
                        "default_value": "ignored",
                    },
                ],
            },
            "widgets": [
                {
                    "widget_type": "kpi",
                    "saved_question_id": str(seeded.question_id),
                    "layout": {"x": 0, "y": 0, "w": 4, "h": 2},
                    "filter_bindings": {"gf_region": "region"},
                },
                {
                    "widget_type": "kpi",
                    "saved_question_id": unbound_question_id,
                    "layout": {"x": 4, "y": 0, "w": 4, "h": 2},
                    "filter_bindings": {},
                },
            ],
        },
        headers=headers,
    )
    assert created.status_code == 201, created.text
    body = created.json()
    bound_id = body["widgets"][0]["id"]
    unbound_id = body["widgets"][1]["id"]
    return body["id"], bound_id, unbound_id


def test_bound_widget_uses_merged_global_filter_parameters(
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
        dashboard_id, bound_id, _ = _create_filter_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=headers,
        )
        executed = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{bound_id}/execute",
            json={"global_filter_values": {"gf_region": "NA", "gf_unused": "x"}},
            headers=headers,
        )
    assert executed.status_code == 200, executed.text
    assert executed.json()["meta"]["status"] == "ok"


def test_changing_global_filter_values_bypasses_stale_cache(
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
        dashboard_id, bound_id, _ = _create_filter_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=headers,
        )
        first = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{bound_id}/execute",
            json={"global_filter_values": {"gf_region": "NA"}},
            headers=headers,
        )
        assert first.status_code == 200, first.text
        assert first.json()["meta"]["cache_hit"] is False

        second_same = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{bound_id}/execute",
            json={"global_filter_values": {"gf_region": "NA"}},
            headers=headers,
        )
        assert second_same.status_code == 200
        assert second_same.json()["meta"]["cache_hit"] is True

        third_different = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{bound_id}/execute",
            json={"global_filter_values": {"gf_region": "APAC"}},
            headers=headers,
        )
    assert third_different.status_code == 200
    assert third_different.json()["meta"]["cache_hit"] is False


def test_unbound_widget_cache_not_affected_by_unrelated_global_filter_change(
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
        dashboard_id, _, unbound_id = _create_filter_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=headers,
        )
        first = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{unbound_id}/execute",
            json={"global_filter_values": {"gf_region": "NA"}},
            headers=headers,
        )
        assert first.status_code == 200, first.text
        assert first.json()["meta"]["cache_hit"] is False

        second = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{unbound_id}/execute",
            json={"global_filter_values": {"gf_region": "NA", "gf_unused": "z"}},
            headers=headers,
        )
    assert second.status_code == 200
    assert second.json()["meta"]["cache_hit"] is True
