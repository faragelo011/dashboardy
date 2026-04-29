"""Shared async DB seeds for external asset grant tests (US3)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from app.db.session import get_async_session_maker, get_engine
from app.models.auth_tenancy import AssetType, MembershipRole, MembershipStatus

from tests.factories import auth_tenancy as factories


@dataclass(frozen=True, slots=True)
class SeededAssetGrantWorkspace:
    tenant_id: uuid.UUID
    workspace_id: uuid.UUID
    admin_user_id: uuid.UUID
    admin_membership_id: uuid.UUID
    external_user_id: uuid.UUID
    external_membership_id: uuid.UUID
    existing_grant_id: uuid.UUID
    non_admin_user_id: uuid.UUID | None = None


async def seed_workspace_with_admin_and_external_client(
    *,
    non_admin_actor_role: MembershipRole | None = None,
) -> SeededAssetGrantWorkspace:
    maker = get_async_session_maker()
    try:
        async with maker() as session:
            tenant = await factories.create_tenant(session)
            workspace = await factories.create_workspace(session, tenant=tenant)

            admin_user_id = uuid.uuid4()
            admin_membership = await factories.create_membership(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=admin_user_id,
                role=MembershipRole.admin,
                status=MembershipStatus.active,
                invited_email="admin@example.com",
            )

            non_admin_user_id: uuid.UUID | None = None
            if non_admin_actor_role is not None:
                non_admin_user_id = uuid.uuid4()
                await factories.create_membership(
                    session,
                    tenant=tenant,
                    workspace=workspace,
                    user_id=non_admin_user_id,
                    role=non_admin_actor_role,
                    status=MembershipStatus.active,
                    invited_email=f"{non_admin_actor_role.value}@example.com",
                )

            external_user_id = uuid.uuid4()
            external_membership = await factories.create_membership(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=external_user_id,
                role=MembershipRole.external_client,
                status=MembershipStatus.active,
                invited_email="client@example.com",
            )

            existing = await factories.create_asset_grant(
                session,
                tenant=tenant,
                workspace=workspace,
                user_id=external_user_id,
                asset_type=AssetType.dashboard,
                asset_id=uuid.uuid4(),
                created_by=admin_membership,
                can_export=False,
            )
            await session.commit()

            return SeededAssetGrantWorkspace(
                tenant_id=tenant.id,
                workspace_id=workspace.id,
                admin_user_id=admin_user_id,
                admin_membership_id=admin_membership.id,
                external_user_id=external_user_id,
                external_membership_id=external_membership.id,
                existing_grant_id=existing.id,
                non_admin_user_id=non_admin_user_id,
            )
    finally:
        await get_engine().dispose()
        get_async_session_maker.cache_clear()
        get_engine.cache_clear()

