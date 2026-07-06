"""Integration tests for permission-filtered dashboard visibility (US4)."""

from __future__ import annotations

import asyncio

import pytest
from app.main import app
from fastapi.testclient import TestClient

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
) -> str:
    created = client.post(
        f"/workspaces/{workspace_id}/dashboards",
        json={
            "collection_id": str(seeded.collection_id),
            "title": "Visibility dashboard",
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
    assert created.status_code == 201, created.text
    return created.json()["id"]


def test_admin_analyst_viewer_and_external_client_dashboard_visibility(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    admin_headers = _headers(monkeypatch, seeded.admin_user_id, "admin@example.com")

    with TestClient(app) as client:
        dashboard_id = _create_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=admin_headers,
        )

        cases = [
            (seeded.admin_user_id, "admin@example.com", True),
            (seeded.analyst_user_id, "analyst@example.com", True),
            (seeded.viewer_user_id, "viewer@example.com", True),
            (seeded.external_user_id, "client@example.com", False),
        ]
        for user_id, email, expect_visible in cases:
            headers = _headers(monkeypatch, user_id, email)
            listed = client.get(
                f"/workspaces/{seeded.workspace_id}/dashboards",
                headers=headers,
            )
            assert listed.status_code == 200
            ids = {item["id"] for item in listed.json()["dashboards"]}
            if expect_visible:
                assert dashboard_id in ids
            else:
                assert dashboard_id not in ids


def test_viewer_cannot_patch_dashboard(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    admin_headers = _headers(monkeypatch, seeded.admin_user_id, "admin@example.com")

    with TestClient(app) as client:
        dashboard_id = _create_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=admin_headers,
        )
        detail = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            headers=admin_headers,
        )
        viewer_headers = _headers(
            monkeypatch,
            seeded.viewer_user_id,
            "viewer@example.com",
        )
        patched = client.patch(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            json={"updated_at": detail.json()["updated_at"], "title": "Renamed"},
            headers=viewer_headers,
        )
    assert patched.status_code == 403
    assert patched.json()["error_code"] == "authz_denied"


def test_viewer_cannot_delete_dashboard(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    admin_headers = _headers(monkeypatch, seeded.admin_user_id, "admin@example.com")

    with TestClient(app) as client:
        dashboard_id = _create_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=admin_headers,
        )
        viewer_headers = _headers(
            monkeypatch,
            seeded.viewer_user_id,
            "viewer@example.com",
        )
        deleted = client.delete(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            headers=viewer_headers,
        )
    assert deleted.status_code == 403
    assert deleted.json()["error_code"] == "authz_denied"


def test_viewer_gets_consumer_detail_with_can_edit_false(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    admin_headers = _headers(monkeypatch, seeded.admin_user_id, "admin@example.com")

    with TestClient(app) as client:
        dashboard_id = _create_dashboard(
            client,
            workspace_id=seeded.workspace_id,
            seeded=seeded,
            headers=admin_headers,
        )
        viewer_headers = _headers(
            monkeypatch,
            seeded.viewer_user_id,
            "viewer@example.com",
        )
        detail = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            headers=viewer_headers,
        )
    assert detail.status_code == 200
    body = detail.json()
    assert body["detail_level"] == "consumer"
    assert body["can_edit"] is False
    for widget in body["widgets"]:
        assert "saved_question_id" not in widget
