"""Integration tests for per-widget filter overrides (US3)."""

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


def _create_override_dashboard(
    client: TestClient,
    *,
    workspace_id: uuid.UUID,
    seeded,
    headers: dict[str, str],
    filter_overrides: dict[str, str] | None = None,
) -> tuple[str, str]:
    created = client.post(
        f"/workspaces/{workspace_id}/dashboards",
        json={
            "collection_id": str(seeded.collection_id),
            "title": "Override dashboard",
            "definition": {
                "layout_version": 1,
                "global_filters": [
                    {
                        "id": "gf_date",
                        "label": "As of date",
                        "value_type": "string",
                        "default_value": "2024-01-01",
                    },
                ],
            },
            "widgets": [
                {
                    "widget_type": "kpi",
                    "saved_question_id": str(seeded.question_id),
                    "layout": {"x": 0, "y": 0, "w": 4, "h": 2},
                    "filter_bindings": {"gf_date": "region"},
                    "filter_overrides": filter_overrides or {},
                },
            ],
        },
        headers=headers,
    )
    assert created.status_code == 201, created.text
    body = created.json()
    return body["id"], body["widgets"][0]["id"]


def test_dashboard_detail_shows_has_active_overrides(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.admin_user_id), "email": "admin@example.com"},
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        dashboard_id, _ = _create_override_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=headers,
            filter_overrides={"gf_date": "2024-03-01"},
        )
        detail = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            headers=headers,
        )
    assert detail.status_code == 200, detail.text
    widget = detail.json()["widgets"][0]
    assert widget["has_active_overrides"] is True
    assert widget["filter_overrides"]["gf_date"] == "2024-03-01"


def test_update_rejects_widget_local_override_keys(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.admin_user_id), "email": "admin@example.com"},
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        dashboard_id, widget_id = _create_override_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=headers,
        )
        current = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            headers=headers,
        )
        assert current.status_code == 200
        body = current.json()
        updated = client.patch(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            json={
                "updated_at": body["updated_at"],
                "widgets": [
                    {
                        "id": widget_id,
                        "widget_type": "kpi",
                        "saved_question_id": str(seeded.question_id),
                        "layout": {"x": 0, "y": 0, "w": 4, "h": 2},
                        "filter_bindings": {"gf_date": "region"},
                        "filter_overrides": {"gf_local_only": "x"},
                    },
                ],
            },
            headers=headers,
        )
    assert updated.status_code == 422, updated.text
    assert updated.json()["error_code"] == "widget_local_filter_forbidden"


def test_execute_uses_override_value_instead_of_global(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.admin_user_id), "email": "admin@example.com"},
    )
    _patch_execute(monkeypatch, seeded.connection_id)
    captured: list[dict[str, object]] = []

    async def _capture_execute(
        session,
        *,
        tenancy,
        auth_user_id,
        payload,
        connection_service,
        **kwargs,
    ):
        captured.append(dict(payload.parameters))
        from app.query_engine.pipeline import execute_workspace_query as real

        return await real(
            session=session,
            tenancy=tenancy,
            auth_user_id=auth_user_id,
            payload=payload,
            connection_service=connection_service,
            **kwargs,
        )

    monkeypatch.setattr(
        "app.dashboards.service.execute_workspace_query",
        _capture_execute,
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        dashboard_id, widget_id = _create_override_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=headers,
            filter_overrides={"gf_date": "2024-03-01"},
        )
        executed = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/execute",
            json={"global_filter_values": {"gf_date": "2024-06-01"}},
            headers=headers,
        )
    assert executed.status_code == 200, executed.text
    assert captured
    assert captured[0]["region"] == "2024-03-01"


def test_viewer_consumer_detail_includes_filter_overrides(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.admin_user_id), "email": "admin@example.com"},
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        dashboard_id, _ = _create_override_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=headers,
            filter_overrides={"gf_date": "2024-03-01"},
        )
        monkeypatch.setattr(
            "app.auth_context.dependencies.decode_supabase_jwt",
            lambda _t: {
                "sub": str(seeded.viewer_user_id),
                "email": "viewer@example.com",
            },
        )
        detail = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            headers=headers,
        )
    assert detail.status_code == 200, detail.text
    body = detail.json()
    assert body["detail_level"] == "consumer"
    widget = body["widgets"][0]
    assert widget["filter_overrides"] == {"gf_date": "2024-03-01"}
    assert widget["has_active_overrides"] is True
    assert "saved_question_id" not in widget


def test_clearing_override_clears_has_active_overrides(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.admin_user_id), "email": "admin@example.com"},
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        dashboard_id, widget_id = _create_override_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=headers,
            filter_overrides={"gf_date": "2024-03-01"},
        )
        current = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            headers=headers,
        )
        assert current.status_code == 200
        body = current.json()
        updated = client.patch(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            json={
                "updated_at": body["updated_at"],
                "widgets": [
                    {
                        "id": widget_id,
                        "widget_type": "kpi",
                        "saved_question_id": str(seeded.question_id),
                        "layout": {"x": 0, "y": 0, "w": 4, "h": 2},
                        "filter_bindings": {"gf_date": "region"},
                        "filter_overrides": {},
                    },
                ],
            },
            headers=headers,
        )
        assert updated.status_code == 200, updated.text
        widget = updated.json()["widgets"][0]
    assert widget["filter_overrides"] == {}
    assert widget["has_active_overrides"] is False
