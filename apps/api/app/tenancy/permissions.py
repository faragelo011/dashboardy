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
    asset_type: AssetType,
    asset_id: UUID,
    grants: list[AssetGrant],
) -> PermissionDecision:
    """External clients may only access assets with an explicit asset grant."""

    if actor_role != MembershipRole.external_client:
        return PermissionDecision(True, PermissionReason.allowed)

    for grant in grants:
        if grant.asset_type == asset_type and grant.asset_id == asset_id:
            return PermissionDecision(True, PermissionReason.allowed)

    return PermissionDecision(False, PermissionReason.grant_required)
