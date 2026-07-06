"""Shared helpers for dashboard integration tests (Feature 006)."""

from __future__ import annotations

import uuid
from typing import Any

import pytest
from app.db.session import get_async_session_maker, get_engine
from app.models.auth_tenancy import AssetType, Membership, Tenant, Workspace
from fastapi.testclient import TestClient
from sqlalchemy import select

from tests.factories import auth_tenancy as factories
from tests.saved_questions_fixtures import SeededQuestionCatalog


def dashboard_test_headers(
    monkeypatch: pytest.MonkeyPatch,
    user_id: uuid.UUID,
    email: str,
) -> dict[str, str]:
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(user_id), "email": email},
    )
    return {"Authorization": "Bearer fake"}


def create_test_dashboard(
    client: TestClient,
    *,
    workspace_id: uuid.UUID,
    seeded: SeededQuestionCatalog,
    headers: dict[str, str],
    title: str = "Test dashboard",
    widgets: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    payload_widgets = widgets or [
        {
            "widget_type": "kpi",
            "saved_question_id": str(seeded.question_id),
            "layout": {"x": 0, "y": 0, "w": 4, "h": 2},
        }
    ]
    created = client.post(
        f"/workspaces/{workspace_id}/dashboards",
        json={
            "collection_id": str(seeded.collection_id),
            "title": title,
            "widgets": payload_widgets,
        },
        headers=headers,
    )
    assert created.status_code == 201, created.text
    return created.json()


async def grant_external_dashboard_asset(
    seeded: SeededQuestionCatalog,
    *,
    dashboard_id: uuid.UUID,
    can_export: bool,
) -> None:
    get_engine.cache_clear()
    get_async_session_maker.cache_clear()
    maker = get_async_session_maker()
    try:
        async with maker() as session:
            admin = (
                await session.execute(
                    select(Membership).where(
                        Membership.tenant_id == seeded.tenant_id,
                        Membership.workspace_id == seeded.workspace_id,
                        Membership.user_id == seeded.admin_user_id,
                    )
                )
            ).scalar_one()
            tenant = await session.get(Tenant, seeded.tenant_id)
            workspace = await session.get(Workspace, seeded.workspace_id)
            assert tenant is not None
            assert workspace is not None
            await factories.create_asset_grant(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=seeded.external_user_id,
                asset_type=AssetType.dashboard,
                asset_id=dashboard_id,
                created_by=admin,
                can_export=can_export,
            )
            await session.commit()
    finally:
        await get_engine().dispose()
        get_async_session_maker.cache_clear()
        get_engine.cache_clear()
