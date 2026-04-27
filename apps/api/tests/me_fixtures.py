"""Shared async DB seeds for `/me` tests."""

from __future__ import annotations

import uuid

from app.db.session import get_async_session_maker, get_engine
from app.models.auth_tenancy import MembershipStatus

from tests.factories import auth_tenancy as factories


async def seed_active_member(user_id: uuid.UUID) -> None:
    maker = get_async_session_maker()
    async with maker() as session:
        tenant = await factories.create_tenant(session)
        workspace = await factories.create_workspace(session, tenant=tenant)
        await factories.create_membership(
            session,
            tenant=tenant,
            workspace=workspace,
            user_id=user_id,
            status=MembershipStatus.active,
        )
        await session.commit()
    await get_engine().dispose()
    get_async_session_maker.cache_clear()
    get_engine.cache_clear()


async def seed_inactive_member(user_id: uuid.UUID) -> None:
    maker = get_async_session_maker()
    async with maker() as session:
        tenant = await factories.create_tenant(session)
        workspace = await factories.create_workspace(session, tenant=tenant)
        await factories.create_membership(
            session,
            tenant=tenant,
            workspace=workspace,
            user_id=user_id,
            status=MembershipStatus.inactive,
        )
        await session.commit()
    await get_engine().dispose()
    get_async_session_maker.cache_clear()
    get_engine.cache_clear()
