"""Database access helpers for Feature 2 tenancy tables."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth_tenancy import (
    AssetGrant,
    CollectionGrant,
    Membership,
    MembershipStatus,
    Tenant,
    Workspace,
)


async def get_tenant(session: AsyncSession, tenant_id: UUID) -> Tenant | None:
    return await session.get(Tenant, tenant_id)


async def get_workspace(session: AsyncSession, workspace_id: UUID) -> Workspace | None:
    return await session.get(Workspace, workspace_id)


async def get_membership_for_user_workspace(
    session: AsyncSession,
    *,
    user_id: UUID,
    workspace_id: UUID,
) -> Membership | None:
    stmt = select(Membership).where(
        Membership.user_id == user_id,
        Membership.workspace_id == workspace_id,
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def list_memberships_for_user(
    session: AsyncSession,
    user_id: UUID,
) -> list[Membership]:
    stmt = (
        select(Membership)
        .where(Membership.user_id == user_id)
        .order_by(Membership.created_at.asc(), Membership.id.asc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def list_active_memberships_for_user(
    session: AsyncSession,
    user_id: UUID,
) -> list[Membership]:
    stmt = (
        select(Membership)
        .where(
            Membership.user_id == user_id,
            Membership.status == MembershipStatus.active,
        )
        .order_by(Membership.created_at.asc(), Membership.id.asc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def list_collection_grants_for_membership(
    session: AsyncSession,
    membership_id: UUID,
) -> list[CollectionGrant]:
    stmt = select(CollectionGrant).where(CollectionGrant.membership_id == membership_id)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def list_asset_grants_for_user_workspace(
    session: AsyncSession,
    *,
    user_id: UUID,
    workspace_id: UUID,
) -> list[AssetGrant]:
    stmt = select(AssetGrant).where(
        AssetGrant.user_id == user_id,
        AssetGrant.workspace_id == workspace_id,
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
