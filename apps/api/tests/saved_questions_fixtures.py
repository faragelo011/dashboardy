"""Shared async DB seeds for saved-questions tests (Feature 005)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from app.db.session import get_async_session_maker, get_engine
from app.models.auth_tenancy import MembershipRole, MembershipStatus
from app.models.data_connections import DataConnection, DbConnectionStatus

from tests.factories import auth_tenancy as factories


@dataclass(frozen=True, slots=True)
class SeededAuthorWorkspace:
    tenant_id: uuid.UUID
    workspace_id: uuid.UUID
    actor_user_id: uuid.UUID
    actor_membership_id: uuid.UUID
    connection_id: uuid.UUID | None = None


async def seed_workspace_with_author(
    *,
    actor_role: MembershipRole = MembershipRole.analyst,
    with_connection: bool = False,
) -> SeededAuthorWorkspace:
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
                status=MembershipStatus.active,
                invited_email=f"{actor_role.value}@example.com",
            )
            connection_id: uuid.UUID | None = None
            if with_connection:
                conn = DataConnection(
                    tenant_id=tenant.id,
                    name="saved-questions test",
                    warehouse="WH",
                    database="DB",
                    schema_="PUBLIC",
                    status=DbConnectionStatus.active,
                    vault_secret_id="vault-test",
                    created_by_membership_id=actor.id,
                )
                session.add(conn)
                await session.flush()
                connection_id = conn.id
            await session.commit()
            return SeededAuthorWorkspace(
                tenant_id=tenant.id,
                workspace_id=workspace.id,
                actor_user_id=actor_user_id,
                actor_membership_id=actor.id,
                connection_id=connection_id,
            )
    finally:
        await get_engine().dispose()
        get_async_session_maker.cache_clear()
        get_engine.cache_clear()
