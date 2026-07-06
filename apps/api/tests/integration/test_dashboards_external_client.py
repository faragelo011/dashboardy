"""External-client dashboard consumption tests (US4)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from fastapi.testclient import TestClient

from tests.dashboards_fixtures import (
    create_test_dashboard,
    dashboard_test_headers,
    grant_external_dashboard_asset,
)
from tests.saved_questions_fixtures import seed_question_catalog


def _external_client_widgets(seeded) -> list[dict]:
    question_id = str(seeded.question_id)
    return [
        {
            "widget_type": "table",
            "saved_question_id": question_id,
            "layout": {"x": 0, "y": 0, "w": 12, "h": 4},
        },
        {
            "widget_type": "kpi",
            "saved_question_id": question_id,
            "layout": {"x": 0, "y": 4, "w": 4, "h": 2},
        },
    ]


def test_external_client_detail_omits_authoring_fields(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    admin_headers = dashboard_test_headers(
        monkeypatch,
        seeded.admin_user_id,
        "admin@example.com",
    )

    with TestClient(app) as client:
        created = create_test_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=admin_headers,
            title="External client dashboard",
            widgets=_external_client_widgets(seeded),
        )
        dashboard_id = created["id"]
    asyncio.run(
        grant_external_dashboard_asset(
            seeded,
            dashboard_id=uuid.UUID(dashboard_id),
            can_export=False,
        )
    )
    with TestClient(app) as client:
        client_headers = dashboard_test_headers(
            monkeypatch,
            seeded.external_user_id,
            "client@example.com",
        )
        detail = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            headers=client_headers,
        )
    assert detail.status_code == 200
    body = detail.json()
    assert body["detail_level"] == "consumer"
    assert body["can_edit"] is False
    for widget in body["widgets"]:
        assert "saved_question_id" not in widget
        assert "sql_text" not in widget
        assert "connection_id" not in widget


def test_external_client_lists_only_granted_dashboards(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    admin_headers = dashboard_test_headers(
        monkeypatch,
        seeded.admin_user_id,
        "admin@example.com",
    )

    with TestClient(app) as client:
        granted = create_test_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=admin_headers,
            title="External client dashboard",
            widgets=_external_client_widgets(seeded),
        )
        other = create_test_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=admin_headers,
            title="Other external client dashboard",
            widgets=_external_client_widgets(seeded),
        )
        granted_id = granted["id"]
        other_id = other["id"]
    asyncio.run(
        grant_external_dashboard_asset(
            seeded,
            dashboard_id=uuid.UUID(granted_id),
            can_export=False,
        )
    )
    with TestClient(app) as client:
        client_headers = dashboard_test_headers(
            monkeypatch,
            seeded.external_user_id,
            "client@example.com",
        )
        listed = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards",
            headers=client_headers,
        )
    assert listed.status_code == 200
    ids = {item["id"] for item in listed.json()["dashboards"]}
    assert granted_id in ids
    assert other_id not in ids


def test_external_client_get_denied_without_dashboard_grant(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    admin_headers = dashboard_test_headers(
        monkeypatch,
        seeded.admin_user_id,
        "admin@example.com",
    )

    with TestClient(app) as client:
        created = create_test_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=admin_headers,
            title="External client dashboard",
            widgets=_external_client_widgets(seeded),
        )
        dashboard_id = created["id"]
        client_headers = dashboard_test_headers(
            monkeypatch,
            seeded.external_user_id,
            "client@example.com",
        )
        detail = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            headers=client_headers,
        )
    assert detail.status_code == 403
    assert detail.json()["error_code"] == "authz_denied"
