"""Shared helpers for dashboard integration tests (Feature 006)."""

from __future__ import annotations

import uuid

from app.db.session import get_async_session_maker, get_engine
from app.models.auth_tenancy import AssetType, Membership, Tenant, Workspace
from sqlalchemy import select

from tests.factories import auth_tenancy as factories
from tests.saved_questions_fixtures import SeededQuestionCatalog


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
