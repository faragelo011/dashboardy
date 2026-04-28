"""Admin member-management service (US2).

Route handlers should stay thin and delegate authorization + membership rules
to this module.
"""

from __future__ import annotations

from uuid import UUID

from app.admin.schemas import Member as MemberSchema
from app.common.enums import MembershipRole, MembershipStatus
from app.models.auth_tenancy import Membership
from app.tenancy import repository
from app.tenancy.permissions import can_manage_members
from app.tenancy.resolver import ResolvedTenancy

from .supabase_admin import SupabaseAdmin


class ServiceError(Exception):
    def __init__(self, *, error_code: str, message: str) -> None:
        super().__init__(message)
        self.error_code = error_code
        self.message = message


class NotAuthorized(ServiceError):
    pass


class NotFound(ServiceError):
    pass


class Conflict(ServiceError):
    pass


def require_admin(actor: ResolvedTenancy) -> None:
    decision = can_manage_members(actor.role)
    if not decision.allowed:
        raise NotAuthorized(
            error_code="authz_denied",
            message="You do not have permission to perform this action.",
        )


def _member_email(membership: Membership) -> str:
    if membership.invited_email:
        return membership.invited_email
    # Fallback: avoid leaking anything; just provide a stable placeholder.
    return f"user+{membership.user_id.hex[:20]}@example.com"


def _to_member_schema(m: Membership) -> MemberSchema:
    return MemberSchema(
        id=m.id,
        user_id=m.user_id,
        email=_member_email(m),
        role=MembershipRole(m.role),
        status=MembershipStatus(m.status),
        created_at=m.created_at,
        deactivated_at=m.deactivated_at,
    )


async def list_members(
    *,
    session,
    actor: ResolvedTenancy,
    workspace_id: UUID,
) -> list[MemberSchema]:
    require_admin(actor)
    rows = await repository.list_memberships_for_workspace(
        session, workspace_id=workspace_id
    )
    return [_to_member_schema(m) for m in rows]


async def invite_member(
    *,
    session,
    actor: ResolvedTenancy,
    workspace_id: UUID,
    email: str,
    role: MembershipRole,
    supabase_admin: SupabaseAdmin,
) -> MemberSchema:
    require_admin(actor)

    normalized_email = email.strip().lower()
    if not normalized_email:
        raise ServiceError(error_code="bad_request", message="Email is required.")

    existing_by_email = await repository.get_membership_for_workspace_by_invited_email(
        session,
        workspace_id=workspace_id,
        invited_email=normalized_email,
    )
    if existing_by_email is not None:
        if existing_by_email.status == MembershipStatus.active:
            return _to_member_schema(existing_by_email)
        raise Conflict(
            error_code="membership_conflict",
            message="Membership already exists but is inactive.",
        )

    invited = await supabase_admin.invite_user(email=normalized_email)
    existing_by_user = await repository.get_membership_for_workspace_by_user_id(
        session,
        workspace_id=workspace_id,
        user_id=invited.user_id,
    )
    if existing_by_user is not None:
        if existing_by_user.status == MembershipStatus.active:
            return _to_member_schema(existing_by_user)
        raise Conflict(
            error_code="membership_conflict",
            message="Membership already exists but is inactive.",
        )

    membership = await repository.create_membership(
        session,
        tenant_id=actor.tenant_id,
        workspace_id=workspace_id,
        user_id=invited.user_id,
        role=role,
        status=MembershipStatus.active,
        invited_email=normalized_email,
    )
    return _to_member_schema(membership)


async def update_member(
    *,
    session,
    actor: ResolvedTenancy,
    workspace_id: UUID,
    membership_id: UUID,
    role: MembershipRole | None,
    status: MembershipStatus | None,
) -> MemberSchema:
    require_admin(actor)

    membership = await repository.get_membership_for_workspace_by_id(
        session,
        workspace_id=workspace_id,
        membership_id=membership_id,
    )
    if membership is None:
        raise NotFound(error_code="not_found", message="Member not found.")

    if role is not None:
        membership = await repository.set_membership_role(
            session,
            workspace_id=workspace_id,
            membership_id=membership_id,
            role=role,
        )
        if membership is None:
            raise NotFound(error_code="not_found", message="Member not found.")

    if status is not None:
        membership = await repository.set_membership_status(
            session,
            workspace_id=workspace_id,
            membership_id=membership_id,
            status=status,
        )
        if membership is None:
            raise NotFound(error_code="not_found", message="Member not found.")

    return _to_member_schema(membership)

