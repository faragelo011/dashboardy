"""External-client dashboard consumption tests (US4)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from fastapi.testclient import TestClient

from tests.dashboards_fixtures import grant_external_dashboard_asset
from tests.saved_questions_fixtures import seed_question_catalog


def _headers(monkeypatch: pytest.MonkeyPatch, user_id, email: str) -> dict[str, str]:
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(user_id), "email": email},
    )
    return {"Authorization": "Bearer fake"}


def _create_dashboard(
    client: TestClient,
    *,
    workspace_id,
    seeded,
    headers: dict[str, str],
    title: str = "External client dashboard",
) -> tuple[str, str]:
    created = client.post(
        f"/workspaces/{workspace_id}/dashboards",
        json={
            "collection_id": str(seeded.collection_id),
            "title": title,
            "widgets": [
                {
                    "widget_type": "table",
                    "saved_question_id": str(seeded.question_id),
                    "layout": {"x": 0, "y": 0, "w": 12, "h": 4},
                },
                {
                    "widget_type": "kpi",
                    "saved_question_id": str(seeded.question_id),
                    "layout": {"x": 0, "y": 4, "w": 4, "h": 2},
                },
            ],
        },
        headers=headers,
    )
    assert created.status_code == 201, created.text
    body = created.json()
    return body["id"], body["widgets"][0]["id"]


def test_external_client_detail_omits_authoring_fields(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    admin_headers = _headers(monkeypatch, seeded.admin_user_id, "admin@example.com")

    with TestClient(app) as client:
        dashboard_id, _ = _create_dashboard(
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
    with TestClient(app) as client:
        client_headers = _headers(
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
    admin_headers = _headers(monkeypatch, seeded.admin_user_id, "admin@example.com")

    with TestClient(app) as client:
        granted_id, _ = _create_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=admin_headers,
        )
        other_id, _ = _create_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=admin_headers,
            title="Other external client dashboard",
        )
    asyncio.run(
        grant_external_dashboard_asset(
            seeded,
            dashboard_id=uuid.UUID(granted_id),
            can_export=False,
        )
    )
    with TestClient(app) as client:
        client_headers = _headers(
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
    admin_headers = _headers(monkeypatch, seeded.admin_user_id, "admin@example.com")

    with TestClient(app) as client:
        dashboard_id, _ = _create_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=admin_headers,
        )
        client_headers = _headers(
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


def test_external_client_get_denied_without_dashboard_grant(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    admin_headers = _headers(monkeypatch, seeded.admin_user_id, "admin@example.com")

    with TestClient(app) as client:
        dashboard_id, _ = _create_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=admin_headers,
        )
        client_headers = _headers(
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
