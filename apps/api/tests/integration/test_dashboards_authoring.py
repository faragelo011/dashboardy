"""Integration tests for dashboard authoring lifecycle (US1)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from app.models.auth_tenancy import MembershipRole
from app.models.dashboards import Dashboard
from fastapi.testclient import TestClient
from sqlalchemy import select

from tests.saved_questions_fixtures import seed_question_catalog, seed_workspace_with_author


def _headers(monkeypatch: pytest.MonkeyPatch, user_id: uuid.UUID, email: str) -> dict[str, str]:
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(user_id), "email": email},
    )
    return {"Authorization": "Bearer fake"}


def test_dashboard_authoring_lifecycle(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_workspace_with_author(actor_role=MembershipRole.analyst))
    headers = _headers(monkeypatch, seeded.actor_user_id, "analyst@example.com")

    with TestClient(app) as client:
        collection = client.post(
            f"/workspaces/{seeded.workspace_id}/collections",
            json={"name": "Revenue"},
            headers=headers,
        )
        assert collection.status_code == 201
        collection_id = collection.json()["id"]

        question = client.post(
            f"/workspaces/{seeded.workspace_id}/questions",
            json={
                "collection_id": collection_id,
                "title": "ARR",
                "sql_text": "SELECT amount FROM revenue",
                "parameters": [],
            },
            headers=headers,
        )
        assert question.status_code == 201
        question_id = question.json()["id"]

        dashboard = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards",
            json={
                "collection_id": collection_id,
                "title": "Revenue Overview",
                "widgets": [
                    {
                        "widget_type": "table",
                        "saved_question_id": question_id,
                        "layout": {"x": 0, "y": 0, "w": 12, "h": 4},
                    }
                ],
            },
            headers=headers,
        )
        assert dashboard.status_code == 201
        dashboard_id = dashboard.json()["id"]
        widget_id = dashboard.json()["widgets"][0]["id"]

        listed = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards",
            params={"collection_id": collection_id},
            headers=headers,
        )
        assert listed.status_code == 200
        assert {d["id"] for d in listed.json()["dashboards"]} == {dashboard_id}

        detail = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            headers=headers,
        )
        assert detail.status_code == 200
        assert detail.json()["detail_level"] == "editor"
        assert detail.json()["widgets"][0]["saved_question_id"] == question_id

        updated = client.patch(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            json={
                "updated_at": detail.json()["updated_at"],
                "title": "Revenue Overview updated",
                "widgets": [
                    {
                        "id": widget_id,
                        "widget_type": "table",
                        "saved_question_id": question_id,
                        "layout": {"x": 0, "y": 0, "w": 8, "h": 4},
                    }
                ],
            },
            headers=headers,
        )
        assert updated.status_code == 200
        assert updated.json()["title"] == "Revenue Overview updated"

        deleted = client.delete(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            headers=headers,
        )
        assert deleted.status_code == 204

        after_delete_list = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards",
            params={"collection_id": collection_id},
            headers=headers,
        )
        assert after_delete_list.json()["dashboards"] == []

        gone = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}",
            headers=headers,
        )
        assert gone.status_code == 404

    async def _row_soft_deleted() -> bool:
        from app.db.session import get_async_session_maker, get_engine

        get_engine.cache_clear()
        get_async_session_maker.cache_clear()

        maker = get_async_session_maker()
        async with maker() as session:
            stmt = select(Dashboard).where(Dashboard.id == uuid.UUID(dashboard_id))
            row = (await session.execute(stmt)).scalar_one_or_none()
            return row is not None and row.deleted_at is not None

    assert asyncio.run(_row_soft_deleted())


def test_viewer_gets_consumer_detail_without_authoring_fields(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    admin_headers = _headers(monkeypatch, seeded.admin_user_id, "admin@example.com")

    with TestClient(app) as client:
        created = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards",
            json={
                "collection_id": str(seeded.collection_id),
                "title": "Executive KPIs",
                "widgets": [
                    {
                        "widget_type": "kpi",
                        "saved_question_id": str(seeded.question_id),
                        "layout": {"x": 0, "y": 0, "w": 4, "h": 2},
                    }
                ],
            },
            headers=admin_headers,
        )
        assert created.status_code == 201
        dashboard_id = created.json()["id"]

        monkeypatch.setattr(
            "app.auth_context.dependencies.decode_supabase_jwt",
            lambda _t: {
                "sub": str(seeded.viewer_user_id),
                "email": "viewer@example.com",
            },
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
        assert "filter_overrides" in widget
        assert "sql_text" not in widget
