"""Test data factories for Feature 2 auth + tenancy tables."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.models.auth_tenancy import (
    AssetGrant,
    AssetType,
    CollectionGrant,
    CollectionPermission,
    Membership,
    MembershipRole,
    MembershipStatus,
    Tenant,
    Workspace,
)
from sqlalchemy.ext.asyncio import AsyncSession


def _require_tenant_matches_workspace(tenant: Tenant, workspace: Workspace) -> None:
    if workspace.tenant_id != tenant.id:
        msg = "workspace.tenant_id must equal tenant.id"
        raise ValueError(msg)


async def create_tenant(session: AsyncSession, *, name: str = "Acme") -> Tenant:
    tenant = Tenant(name=name)
    session.add(tenant)
    await session.flush()
    return tenant


async def create_workspace(
    session: AsyncSession,
    *,
    tenant: Tenant,
    name: str = "Default",
    slug: str = "default",
) -> Workspace:
    ws = Workspace(tenant_id=tenant.id, name=name, slug=slug)
    session.add(ws)
    await session.flush()
    return ws


async def create_membership(
    session: AsyncSession,
    *,
    tenant: Tenant,
    workspace: Workspace,
    user_id: uuid.UUID,
    role: MembershipRole = MembershipRole.admin,
    status: MembershipStatus = MembershipStatus.active,
    invited_email: str | None = None,
) -> Membership:
    _require_tenant_matches_workspace(tenant, workspace)
    m = Membership(
        tenant_id=tenant.id,
        workspace_id=workspace.id,
        user_id=user_id,
        role=role,
        status=status,
        invited_email=invited_email,
    )
    session.add(m)
    await session.flush()
    return m


async def create_collection_grant(
    session: AsyncSession,
    *,
    tenant: Tenant,
    workspace: Workspace,
    membership: Membership,
    collection_id: uuid.UUID,
    permission: CollectionPermission = CollectionPermission.read,
) -> CollectionGrant:
    _require_tenant_matches_workspace(tenant, workspace)
    if membership.tenant_id != tenant.id or membership.workspace_id != workspace.id:
        msg = (
            "membership.tenant_id and membership.workspace_id must match "
            "the grant's tenant and workspace"
        )
        raise ValueError(msg)
    g = CollectionGrant(
        tenant_id=tenant.id,
        workspace_id=workspace.id,
        collection_id=collection_id,
        membership_id=membership.id,
        permission=permission,
    )
    session.add(g)
    await session.flush()
    return g


async def create_asset_grant(
    session: AsyncSession,
    *,
    tenant: Tenant,
    workspace: Workspace,
    user_id: uuid.UUID,
    asset_id: uuid.UUID,
    created_by: Membership,
    asset_type: AssetType = AssetType.dashboard,
    can_export: bool = False,
) -> AssetGrant:
    _require_tenant_matches_workspace(tenant, workspace)
    if created_by.tenant_id != tenant.id or created_by.workspace_id != workspace.id:
        msg = (
            "created_by membership must belong to the same tenant and workspace "
            "as the asset grant"
        )
        raise ValueError(msg)
    g = AssetGrant(
        tenant_id=tenant.id,
        workspace_id=workspace.id,
        user_id=user_id,
        asset_type=asset_type,
        asset_id=asset_id,
        can_export=can_export,
        created_by_membership_id=created_by.id,
    )
    session.add(g)
    await session.flush()
    return g


def utcnow() -> datetime:
    return datetime.now(tz=UTC)
