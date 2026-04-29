"""Shared async DB seeds for `/workspaces/switch` tests (US4)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from app.db.session import get_async_session_maker, get_engine
from app.models.auth_tenancy import MembershipRole, MembershipStatus

from tests.factories import auth_tenancy as factories


@dataclass(frozen=True, slots=True)
class SeededSwitchWorkspace:
    tenant_id: uuid.UUID
    workspace_id: uuid.UUID
    actor_user_id: uuid.UUID


async def seed_workspace_switch_actor(
    *,
    actor_role: MembershipRole = MembershipRole.viewer,
    actor_status: MembershipStatus = MembershipStatus.active,
) -> SeededSwitchWorkspace:
    maker = get_async_session_maker()
    try:
        async with maker() as session:
            tenant = await factories.create_tenant(session)
            workspace = await factories.create_workspace(session, tenant=tenant)
            actor_user_id = uuid.uuid4()
            await factories.create_membership(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=actor_user_id,
                role=actor_role,
                status=actor_status,
                invited_email=f"{actor_role.value}@example.com",
            )
            await session.commit()
            return SeededSwitchWorkspace(
                tenant_id=tenant.id,
                workspace_id=workspace.id,
                actor_user_id=actor_user_id,
            )
    finally:
        await get_engine().dispose()
        get_async_session_maker.cache_clear()
        get_engine.cache_clear()

