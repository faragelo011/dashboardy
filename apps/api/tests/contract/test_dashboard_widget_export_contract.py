"""Contract checks for dashboard widget CSV export endpoint (US4)."""

from __future__ import annotations

import asyncio
import json
import uuid
from urllib.parse import quote

import pytest
from app.main import app
from app.query_engine.enums import ExecutionStatus
from app.query_engine.snowflake_run import SnowflakeSelectOutcome
from fastapi.testclient import TestClient

from tests.dashboards_fixtures import (
    grant_external_dashboard_asset,
    patch_dashboard_widget_execute,
)
from tests.saved_questions_fixtures import seed_question_catalog


def _patch_execute(monkeypatch: pytest.MonkeyPatch, connection_id: uuid.UUID) -> None:
    patch_dashboard_widget_execute(monkeypatch, connection_id)


def _filter_state(values: dict[str, object] | None = None) -> str:
    payload = {"global_filter_values": values or {"gf_region": "EMEA"}}
    return quote(json.dumps(payload))


def _create_table_dashboard(
    client: TestClient,
    *,
    workspace_id: uuid.UUID,
    seeded,
    headers: dict[str, str],
) -> tuple[str, str]:
    created = client.post(
        f"/workspaces/{workspace_id}/dashboards",
        json={
            "collection_id": str(seeded.collection_id),
            "title": "Export contract dashboard",
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
                    "widget_type": "table",
                    "saved_question_id": str(seeded.question_id),
                    "layout": {"x": 0, "y": 0, "w": 12, "h": 4},
                    "filter_bindings": {"gf_region": "region"},
                }
            ],
        },
        headers=headers,
    )
    assert created.status_code == 201, created.text
    body = created.json()
    return body["id"], body["widgets"][0]["id"]


def test_export_dashboard_widget_success(
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
        dashboard_id, widget_id = _create_table_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=headers,
        )
        exported = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/export.csv",
            params={"filter_state": _filter_state()},
            headers=headers,
        )

    assert exported.status_code == 200
    assert exported.headers["content-type"].startswith("text/csv")
    assert exported.text.splitlines()[0] == "region,amount"
    assert "EMEA,42" in exported.text


def test_export_forbidden_for_external_client_without_grant(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.external_user_id), "email": "client@example.com"},
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        monkeypatch.setattr(
            "app.auth_context.dependencies.decode_supabase_jwt",
            lambda _t: {"sub": str(seeded.admin_user_id), "email": "admin@example.com"},
        )
        dashboard_id, widget_id = _create_table_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers={"Authorization": "Bearer fake"},
        )
    asyncio.run(
        grant_external_dashboard_asset(
            seeded,
            dashboard_id=uuid.UUID(dashboard_id),
            can_export=False,
        )
    )
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {
            "sub": str(seeded.external_user_id),
            "email": "client@example.com",
        },
    )
    with TestClient(app) as client:
        exported = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/export.csv",
            params={"filter_state": _filter_state()},
            headers=headers,
        )

    assert exported.status_code == 403
    assert exported.json()["error_code"] == "export_not_permitted"


def test_export_rejects_non_table_widget(
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
        created = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards",
            json={
                "collection_id": str(seeded.collection_id),
                "title": "KPI export dashboard",
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
        assert created.status_code == 201
        dashboard_id = created.json()["id"]
        widget_id = created.json()["widgets"][0]["id"]
        exported = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/export.csv",
            params={"filter_state": _filter_state({})},
            headers=headers,
        )

    assert exported.status_code == 422
    assert exported.json()["error_code"] == "unsupported_widget_type"


def test_export_denied_without_dashboard_view(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    admin_headers = {"Authorization": "Bearer fake"}
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.admin_user_id), "email": "admin@example.com"},
    )

    with TestClient(app) as client:
        dashboard_id, widget_id = _create_table_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=admin_headers,
        )
        monkeypatch.setattr(
            "app.auth_context.dependencies.decode_supabase_jwt",
            lambda _t: {
                "sub": str(seeded.external_user_id),
                "email": "client@example.com",
            },
        )
        exported = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/export.csv",
            params={"filter_state": _filter_state()},
            headers={"Authorization": "Bearer fake"},
        )

    assert exported.status_code == 403
    assert exported.json()["error_code"] == "authz_denied"


def test_export_rejects_invalid_filter_state(
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
        dashboard_id, widget_id = _create_table_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=headers,
        )
        invalid_json = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/export.csv",
            params={"filter_state": "%7Bnot-json"},
            headers=headers,
        )
        too_long = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/export.csv",
            params={"filter_state": "x" * 2049},
            headers=headers,
        )

    assert invalid_json.status_code == 422
    assert invalid_json.json()["error_code"] == "invalid_parameters"
    assert too_long.status_code == 422
    assert too_long.json()["error_code"] == "invalid_parameters"


def test_export_allows_truncated_ok_execution(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Soft truncation still yields CSV (Feature 5 parity); renderer caps at 10k."""
    seeded = asyncio.run(seed_question_catalog())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.admin_user_id), "email": "admin@example.com"},
    )
    patch_dashboard_widget_execute(
        monkeypatch,
        seeded.connection_id,
        outcome=SnowflakeSelectOutcome(
            column_names=["region", "amount"],
            column_types=["STRING", "INTEGER"],
            rows=[["EMEA", 42]],
            status=ExecutionStatus.ok,
            truncated=True,
            snowflake_wall_ms=1,
            bytes_scanned=None,
            message=None,
        ),
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        dashboard_id, widget_id = _create_table_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=headers,
        )
        exported = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/export.csv",
            params={
                "filter_state": _filter_state(),
                "bypass_cache": "true",
            },
            headers=headers,
        )

    assert exported.status_code == 200
    assert exported.headers["content-type"].startswith("text/csv")
    assert "EMEA" in exported.text


def test_export_rejects_non_ok_execution(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.admin_user_id), "email": "admin@example.com"},
    )
    patch_dashboard_widget_execute(
        monkeypatch,
        seeded.connection_id,
        outcome=SnowflakeSelectOutcome(
            column_names=["region", "amount"],
            column_types=["STRING", "INTEGER"],
            rows=[],
            status=ExecutionStatus.warehouse_error,
            truncated=False,
            snowflake_wall_ms=1,
            bytes_scanned=None,
            message="warehouse failed",
        ),
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        dashboard_id, widget_id = _create_table_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=headers,
        )
        exported = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/export.csv",
            params={
                "filter_state": _filter_state(),
                "bypass_cache": "true",
            },
            headers=headers,
        )

    assert exported.status_code == 422
    assert exported.json()["error_code"] == "export_execution_refused"
