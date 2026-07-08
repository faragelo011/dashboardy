"""Integration tests for dashboard clone semantics (US5)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.dashboards import repository as dashboards_repository
from app.dashboards.service import DashboardService, DuplicateDashboardTitleError
from app.db.session import get_async_session_maker, get_engine
from app.main import app
from app.models.auth_tenancy import Membership
from app.models.dashboards import Dashboard
from fastapi.testclient import TestClient
from sqlalchemy import select

from tests.dashboards_fixtures import (
    create_test_dashboard,
    dashboard_test_headers,
    grant_external_dashboard_asset,
)
from tests.saved_questions_fixtures import seed_question_catalog

_SOURCE_DEFINITION = {
    "layout_version": 1,
    "global_filters": [
        {
            "id": "region",
            "label": "Region",
            "value_type": "string",
            "default_value": "EMEA",
        }
    ],
}

_SOURCE_WIDGETS = [
    {
        "widget_type": "kpi",
        "saved_question_id": None,
        "layout": {"x": 0, "y": 0, "w": 4, "h": 2},
        "filter_bindings": {"region": "region"},
        "filter_overrides": {"region": "APAC"},
    }
]


def _source_payload(seeded) -> dict:
    return {
        "definition": _SOURCE_DEFINITION,
        "widgets": [
            {
                **widget,
                "saved_question_id": str(seeded.question_id),
            }
            for widget in _SOURCE_WIDGETS
        ],
    }


def test_clone_copies_widgets_and_resets_grants(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    admin_headers = dashboard_test_headers(
        monkeypatch,
        seeded.admin_user_id,
        "admin@example.com",
    )
    source_payload = _source_payload(seeded)

    with TestClient(app) as client:
        created = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards",
            json={
                "collection_id": str(seeded.collection_id),
                "title": "Executive KPIs",
                **source_payload,
            },
            headers=admin_headers,
        )
        assert created.status_code == 201, created.text
        source_body = created.json()
        source_id = source_body["id"]
        source_widget_id = source_body["widgets"][0]["id"]

        cloned = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards/{source_id}/clone",
            json={"target_collection_id": str(seeded.collection_id)},
            headers=admin_headers,
        )
        assert cloned.status_code == 201, cloned.text
        body = cloned.json()
        clone_id = body["id"]

        source_after = client.get(
            f"/workspaces/{seeded.workspace_id}/dashboards/{source_id}",
            headers=admin_headers,
        )

    assert source_after.status_code == 200
    source_after_body = source_after.json()
    assert source_after_body["id"] == source_id
    assert source_after_body["title"] == "Executive KPIs"
    assert source_after_body["widgets"][0]["id"] == source_widget_id
    assert source_after_body["definition"] == _SOURCE_DEFINITION

    assert clone_id != source_id
    assert body["collection_id"] == str(seeded.collection_id)
    assert body["title"].startswith("Executive KPIs")
    assert body["detail_level"] == "editor"
    assert body["definition"]["global_filters"] == _SOURCE_DEFINITION["global_filters"]
    assert len(body["widgets"]) == 1
    assert body["widgets"][0]["id"] != source_widget_id
    assert body["widgets"][0]["saved_question_id"] == str(seeded.question_id)
    assert body["widgets"][0]["filter_bindings"] == {"region": "region"}
    assert body["widgets"][0]["filter_overrides"] == {"region": "APAC"}

    async def _verify_db() -> None:
        get_engine.cache_clear()
        get_async_session_maker.cache_clear()
        maker = get_async_session_maker()
        async with maker() as session:
            admin_membership = (
                await session.execute(
                    select(Membership).where(
                        Membership.tenant_id == seeded.tenant_id,
                        Membership.workspace_id == seeded.workspace_id,
                        Membership.user_id == seeded.admin_user_id,
                    )
                )
            ).scalar_one()
            clone_row = await session.get(Dashboard, uuid.UUID(clone_id))
            assert clone_row is not None
            assert clone_row.created_by_membership_id == admin_membership.id
            grants = await dashboards_repository.list_dashboard_grants_for_dashboard(
                session,
                tenant_id=seeded.tenant_id,
                workspace_id=seeded.workspace_id,
                dashboard_id=uuid.UUID(clone_id),
            )
            assert grants == []

    asyncio.run(_verify_db())


def test_viewer_cannot_clone_even_if_can_view(
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
            title="Executive KPIs",
        )
        dashboard_id = created["id"]

        viewer_headers = dashboard_test_headers(
            monkeypatch,
            seeded.viewer_user_id,
            "viewer@example.com",
        )
        forbidden = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/clone",
            json={"target_collection_id": str(seeded.collection_id)},
            headers=viewer_headers,
        )

    assert forbidden.status_code == 403
    assert forbidden.json()["error_code"] == "authz_denied"


def test_external_client_with_grant_cannot_clone(
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
            title="Executive KPIs",
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

        forbidden = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/clone",
            json={"target_collection_id": str(seeded.collection_id)},
            headers=client_headers,
        )

    assert forbidden.status_code == 403
    assert forbidden.json()["error_code"] == "authz_denied"


def test_clone_returns_duplicate_title_when_no_unique_name(
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
            title="Executive KPIs",
        )
        dashboard_id = created["id"]

        async def _always_duplicate(*_args, **_kwargs) -> None:
            raise DuplicateDashboardTitleError()

        monkeypatch.setattr(
            DashboardService,
            "_assert_unique_title",
            _always_duplicate,
        )
        conflict = client.post(
            f"/workspaces/{seeded.workspace_id}/dashboards/{dashboard_id}/clone",
            json={"target_collection_id": str(seeded.collection_id)},
            headers=admin_headers,
        )

    assert conflict.status_code == 409
    assert conflict.json()["error_code"] == "duplicate_dashboard_title"
