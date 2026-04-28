"""Database access helpers for Feature 2 tenancy tables."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth_tenancy import (
    AssetGrant,
    CollectionGrant,
    Membership,
    MembershipRole,
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


async def list_memberships_for_workspace(
    session: AsyncSession,
    *,
    workspace_id: UUID,
    limit: int = 200,
) -> list[Membership]:
    stmt = (
        select(Membership)
        .where(Membership.workspace_id == workspace_id)
        .order_by(Membership.created_at.asc(), Membership.id.asc())
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_membership_for_workspace_by_id(
    session: AsyncSession,
    *,
    workspace_id: UUID,
    membership_id: UUID,
) -> Membership | None:
    stmt = select(Membership).where(
        Membership.workspace_id == workspace_id,
        Membership.id == membership_id,
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_membership_for_workspace_by_user_id(
    session: AsyncSession,
    *,
    workspace_id: UUID,
    user_id: UUID,
) -> Membership | None:
    stmt = select(Membership).where(
        Membership.workspace_id == workspace_id,
        Membership.user_id == user_id,
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_membership_for_workspace_by_invited_email(
    session: AsyncSession,
    *,
    workspace_id: UUID,
    invited_email: str,
) -> Membership | None:
    stmt = select(Membership).where(
        Membership.workspace_id == workspace_id,
        Membership.invited_email == invited_email,
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def create_membership(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    workspace_id: UUID,
    user_id: UUID,
    role: MembershipRole,
    status: MembershipStatus,
    invited_email: str | None,
) -> Membership:
    m = Membership(
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        user_id=user_id,
        role=role,
        status=status,
        invited_email=invited_email,
    )
    session.add(m)
    await session.flush()
    return m


async def set_membership_role(
    session: AsyncSession,
    *,
    workspace_id: UUID,
    membership_id: UUID,
    role: MembershipRole,
) -> Membership | None:
    stmt = (
        update(Membership)
        .where(Membership.workspace_id == workspace_id, Membership.id == membership_id)
        .values(role=role)
        .returning(Membership)
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def set_membership_status(
    session: AsyncSession,
    *,
    workspace_id: UUID,
    membership_id: UUID,
    status: MembershipStatus,
) -> Membership | None:
    if status == MembershipStatus.inactive:
        values = {"status": status, "deactivated_at": datetime.now(tz=UTC)}
    else:
        values = {"status": status, "deactivated_at": None}

    stmt = (
        update(Membership)
        .where(Membership.workspace_id == workspace_id, Membership.id == membership_id)
        .values(**values)
        .returning(Membership)
    )
    return (await session.execute(stmt)).scalar_one_or_none()


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
