"""Resolve tenant/workspace membership context for an authenticated user (skeleton)."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth_tenancy import Membership, MembershipStatus, Tenant, Workspace
from app.tenancy import repository


@dataclass(frozen=True, slots=True)
class ResolvedTenancy:
    """Workspace context from membership rows (MVP: one workspace per tenant)."""

    tenant_id: UUID
    workspace_id: UUID
    workspace_name: str
    membership_id: UUID
    role: str
    membership_status: MembershipStatus


async def resolve_active_membership(
    session: AsyncSession,
    user_id: UUID,
) -> ResolvedTenancy | None:
    """Load the user's active membership with tenant + workspace metadata.

    MVP behavior: if multiple active memberships exist, the first row returned by
    the database ordering is used. Phase 3+ can tighten selection rules.
    """

    stmt = (
        select(Membership, Workspace, Tenant)
        .join(Workspace, Workspace.id == Membership.workspace_id)
        .join(Tenant, Tenant.id == Membership.tenant_id)
        .where(
            Membership.user_id == user_id,
            Membership.status == MembershipStatus.active,
        )
    )
    row = (await session.execute(stmt)).first()
    if row is None:
        return None

    membership, workspace, _tenant = row
    return ResolvedTenancy(
        tenant_id=membership.tenant_id,
        workspace_id=workspace.id,
        workspace_name=workspace.name,
        membership_id=membership.id,
        role=membership.role.value,
        membership_status=membership.status,
    )


async def resolve_membership_for_workspace(
    session: AsyncSession,
    *,
    user_id: UUID,
    workspace_id: UUID,
) -> ResolvedTenancy | None:
    membership = await repository.get_membership_for_user_workspace(
        session,
        user_id=user_id,
        workspace_id=workspace_id,
    )
    if membership is None or membership.status != MembershipStatus.active:
        return None

    workspace = await repository.get_workspace(session, workspace_id)
    if workspace is None:
        return None

    return ResolvedTenancy(
        tenant_id=membership.tenant_id,
        workspace_id=workspace.id,
        workspace_name=workspace.name,
        membership_id=membership.id,
        role=membership.role.value,
        membership_status=membership.status,
    )
