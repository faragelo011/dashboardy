"""Shared async DB seeds for member-management tests (US2)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from app.db.session import get_async_session_maker, get_engine
from app.models.auth_tenancy import MembershipRole, MembershipStatus

from tests.factories import auth_tenancy as factories


@dataclass(frozen=True, slots=True)
class SeededWorkspace:
    tenant_id: uuid.UUID
    workspace_id: uuid.UUID
    actor_user_id: uuid.UUID
    actor_membership_id: uuid.UUID
    other_membership_id: uuid.UUID | None = None


async def seed_workspace_with_actor(
    *,
    actor_role: MembershipRole,
    actor_status: MembershipStatus = MembershipStatus.active,
    create_other_member: bool = False,
    other_role: MembershipRole = MembershipRole.viewer,
    other_status: MembershipStatus = MembershipStatus.active,
    other_email: str = "member@example.com",
) -> SeededWorkspace:
    maker = get_async_session_maker()
    try:
        async with maker() as session:
            tenant = await factories.create_tenant(session)
            workspace = await factories.create_workspace(session, tenant=tenant)
            actor_user_id = uuid.uuid4()
            actor = await factories.create_membership(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=actor_user_id,
                role=actor_role,
                status=actor_status,
                invited_email=f"{actor_role.value}@example.com",
            )
            other_membership_id: uuid.UUID | None = None
            if create_other_member:
                other = await factories.create_membership(
                    session,
                    tenant=tenant,
                    workspace=workspace,
                    user_id=uuid.uuid4(),
                    role=other_role,
                    status=other_status,
                    invited_email=other_email,
                )
                other_membership_id = other.id
            await session.commit()
            return SeededWorkspace(
                tenant_id=tenant.id,
                workspace_id=workspace.id,
                actor_user_id=actor_user_id,
                actor_membership_id=actor.id,
                other_membership_id=other_membership_id,
            )
    finally:
        await get_engine().dispose()
        get_async_session_maker.cache_clear()
        get_engine.cache_clear()

