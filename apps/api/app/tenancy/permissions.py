"""Central permission decisions for Feature 2 (baseline rules)."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID

from app.models.auth_tenancy import (
    AssetGrant,
    AssetType,
    MembershipRole,
    MembershipStatus,
)


class PermissionReason(StrEnum):
    """Internal deny/allow reasons consumed by route handlers."""

    allowed = "allowed"
    missing_token = "missing_token"
    invalid_token = "invalid_token"
    no_membership = "no_membership"
    inactive_membership = "inactive_membership"
    role_not_allowed = "role_not_allowed"
    grant_required = "grant_required"
    tenant_mismatch = "tenant_mismatch"


@dataclass(frozen=True, slots=True)
class PermissionDecision:
    allowed: bool
    reason: PermissionReason


def require_active_membership_status(status: MembershipStatus) -> PermissionDecision:
    if status != MembershipStatus.active:
        return PermissionDecision(False, PermissionReason.inactive_membership)
    return PermissionDecision(True, PermissionReason.allowed)


def require_same_tenant(
    *,
    context_tenant_id: UUID,
    resource_tenant_id: UUID,
) -> PermissionDecision:
    if context_tenant_id != resource_tenant_id:
        return PermissionDecision(False, PermissionReason.tenant_mismatch)
    return PermissionDecision(True, PermissionReason.allowed)


def can_manage_members(actor_role: MembershipRole) -> PermissionDecision:
    if actor_role != MembershipRole.admin:
        return PermissionDecision(False, PermissionReason.role_not_allowed)
    return PermissionDecision(True, PermissionReason.allowed)


def can_use_collection_grant_path(actor_role: MembershipRole) -> PermissionDecision:
    """External clients must never inherit internal collection-grant access."""

    if actor_role == MembershipRole.external_client:
        return PermissionDecision(False, PermissionReason.grant_required)
    return PermissionDecision(True, PermissionReason.allowed)


def can_access_asset_via_explicit_grant(
    *,
    actor_role: MembershipRole,
    actor_user_id: UUID | None = None,
    actor_workspace_id: UUID | None = None,
    asset_type: AssetType,
    asset_id: UUID,
    grants: list[AssetGrant],
) -> PermissionDecision:
    """External clients may only access assets with an explicit asset grant."""

    if actor_role != MembershipRole.external_client:
        return PermissionDecision(True, PermissionReason.allowed)

    if actor_user_id is None or actor_workspace_id is None:
        return PermissionDecision(False, PermissionReason.grant_required)

    for grant in grants:
        if (
            grant.asset_type == asset_type
            and grant.asset_id == asset_id
            and grant.user_id == actor_user_id
            and grant.workspace_id == actor_workspace_id
        ):
            return PermissionDecision(True, PermissionReason.allowed)

    return PermissionDecision(False, PermissionReason.grant_required)
