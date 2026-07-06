"""Integration tests for dashboard widget CSV export (US4)."""

from __future__ import annotations

import asyncio
import json
import uuid
from types import SimpleNamespace
from urllib.parse import quote

import pytest
from app.main import app
from app.query_engine.enums import ExecutionStatus
from app.query_engine.snowflake_run import SnowflakeSelectOutcome
from fastapi.testclient import TestClient

from tests.dashboards_fixtures import grant_external_dashboard_asset
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
        "app.routes.dashboards.get_connection_service",
        lambda vault_required=True: _ConnSvc(),  # noqa: ARG005
    )


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
            "title": f"Export integration dashboard {uuid.uuid4().hex[:8]}",
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


@pytest.mark.parametrize(
    ("user_id_attr", "email"),
    [
        ("admin_user_id", "admin@example.com"),
        ("analyst_user_id", "analyst@example.com"),
        ("viewer_user_id", "viewer@example.com"),
    ],
)
def test_internal_roles_can_export_table_widget(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
    user_id_attr: str,
    email: str,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    _patch_execute(monkeypatch, seeded.connection_id)
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

        user_id = getattr(seeded, user_id_attr)
        monkeypatch.setattr(
            "app.auth_context.dependencies.decode_supabase_jwt",
            lambda _t: {"sub": str(user_id), "email": email},
        )
        exported = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/export.csv",
            params={"filter_state": _filter_state()},
            headers={"Authorization": "Bearer fake"},
        )

    assert exported.status_code == 200
    assert exported.headers["content-type"].startswith("text/csv")
    assert exported.text.splitlines()[0] == "region"


def test_external_client_without_export_grant_is_forbidden(
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
            headers={"Authorization": "Bearer fake"},
        )

    assert exported.status_code == 403
    assert exported.json()["error_code"] == "export_not_permitted"


def test_external_client_with_export_grant_receives_csv(
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
    asyncio.run(
        grant_external_dashboard_asset(
            seeded,
            dashboard_id=uuid.UUID(dashboard_id),
            can_export=True,
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
            headers={"Authorization": "Bearer fake"},
        )

    assert exported.status_code == 200
    assert exported.headers["content-type"].startswith("text/csv")


def test_export_rejects_kpi_widget_type(
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
                "title": "KPI only",
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
