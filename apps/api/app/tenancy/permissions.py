"""Central permission decisions for Feature 2 (baseline rules)."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID

from app.models.auth_tenancy import (
    AssetGrant,
    AssetType,
    CollectionPermission,
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


def can_access_question_via_grant(
    *,
    actor_role: MembershipRole,
    actor_user_id: UUID | None = None,
    actor_workspace_id: UUID | None = None,
    question_id: UUID,
    grants: list[AssetGrant],
) -> PermissionDecision:
    return can_access_asset_via_explicit_grant(
        actor_role=actor_role,
        actor_user_id=actor_user_id,
        actor_workspace_id=actor_workspace_id,
        asset_type=AssetType.question,
        asset_id=question_id,
        grants=grants,
    )


def can_access_dashboard_via_grant(
    *,
    actor_role: MembershipRole,
    actor_user_id: UUID | None = None,
    actor_workspace_id: UUID | None = None,
    dashboard_id: UUID,
    grants: list[AssetGrant],
) -> PermissionDecision:
    return can_access_asset_via_explicit_grant(
        actor_role=actor_role,
        actor_user_id=actor_user_id,
        actor_workspace_id=actor_workspace_id,
        asset_type=AssetType.dashboard,
        asset_id=dashboard_id,
        grants=grants,
    )


def can_execute_workspace_query(actor_role: MembershipRole) -> PermissionDecision:
    """Feature 4: ad hoc warehouse execution is limited to authoring roles."""

    if actor_role in (MembershipRole.admin, MembershipRole.analyst):
        return PermissionDecision(True, PermissionReason.allowed)
    return PermissionDecision(False, PermissionReason.role_not_allowed)


def widen_grant_permission(
    *,
    collection_permission: CollectionPermission | None,
    question_permission: CollectionPermission | None,
) -> CollectionPermission | None:
    """Question grants widen collection inheritance only; never deny."""

    if collection_permission is None and question_permission is None:
        return None
    if CollectionPermission.edit in {collection_permission, question_permission}:
        return CollectionPermission.edit
    return CollectionPermission.view


def internal_author_has_implicit_edit(actor_role: MembershipRole) -> bool:
    return actor_role in (MembershipRole.admin, MembershipRole.analyst)


def resolve_internal_collection_grant_access(
    *,
    actor_role: MembershipRole,
    collection_permission: CollectionPermission | None,
) -> PermissionDecision:
    if actor_role == MembershipRole.external_client:
        return PermissionDecision(False, PermissionReason.grant_required)
    if internal_author_has_implicit_edit(actor_role):
        return PermissionDecision(True, PermissionReason.allowed)
    if collection_permission is None:
        return PermissionDecision(False, PermissionReason.grant_required)
    return PermissionDecision(True, PermissionReason.allowed)


def resolve_internal_question_grant_access(
    *,
    actor_role: MembershipRole,
    collection_permission: CollectionPermission | None,
    question_permission: CollectionPermission | None,
) -> PermissionDecision:
    if actor_role == MembershipRole.external_client:
        return PermissionDecision(False, PermissionReason.grant_required)
    if internal_author_has_implicit_edit(actor_role):
        return PermissionDecision(True, PermissionReason.allowed)
    effective = widen_grant_permission(
        collection_permission=collection_permission,
        question_permission=question_permission,
    )
    if effective is None:
        return PermissionDecision(False, PermissionReason.grant_required)
    return PermissionDecision(True, PermissionReason.allowed)


def resolve_internal_dashboard_grant_access(
    *,
    actor_role: MembershipRole,
    collection_permission: CollectionPermission | None,
    dashboard_permission: CollectionPermission | None,
) -> PermissionDecision:
    return resolve_internal_question_grant_access(
        actor_role=actor_role,
        collection_permission=collection_permission,
        question_permission=dashboard_permission,
    )


def resolve_external_client_dashboard_asset_grant(
    *,
    actor_role: MembershipRole,
    actor_user_id: UUID | None,
    actor_workspace_id: UUID | None,
    dashboard_id: UUID,
    grants: list[AssetGrant],
) -> PermissionDecision:
    if actor_role != MembershipRole.external_client:
        return PermissionDecision(True, PermissionReason.allowed)
    return can_access_dashboard_via_grant(
        actor_role=actor_role,
        actor_user_id=actor_user_id,
        actor_workspace_id=actor_workspace_id,
        dashboard_id=dashboard_id,
        grants=grants,
    )


def resolve_external_client_question_asset_grant(
    *,
    actor_role: MembershipRole,
    actor_user_id: UUID | None,
    actor_workspace_id: UUID | None,
    question_id: UUID,
    grants: list[AssetGrant],
) -> PermissionDecision:
    if actor_role != MembershipRole.external_client:
        return PermissionDecision(True, PermissionReason.allowed)
    if actor_user_id is None or actor_workspace_id is None:
        return PermissionDecision(False, PermissionReason.grant_required)
    for grant in grants:
        if (
            grant.asset_type == AssetType.question
            and grant.asset_id == question_id
            and grant.user_id == actor_user_id
            and grant.workspace_id == actor_workspace_id
        ):
            return PermissionDecision(True, PermissionReason.allowed)
    return PermissionDecision(False, PermissionReason.grant_required)


def can_export_saved_question_for_role(
    *,
    actor_role: MembershipRole,
    has_visible_question_access: bool,
    asset_grants: list[AssetGrant],
    question_id: UUID,
    actor_user_id: UUID | None = None,
    actor_workspace_id: UUID | None = None,
) -> PermissionDecision:
    if not has_visible_question_access:
        return PermissionDecision(False, PermissionReason.grant_required)

    if actor_role == MembershipRole.external_client:
        if actor_user_id is None or actor_workspace_id is None:
            return PermissionDecision(False, PermissionReason.grant_required)
        for grant in asset_grants:
            if (
                grant.asset_type == AssetType.question
                and grant.asset_id == question_id
                and grant.user_id == actor_user_id
                and grant.workspace_id == actor_workspace_id
                and grant.can_export
            ):
                return PermissionDecision(True, PermissionReason.allowed)
        return PermissionDecision(False, PermissionReason.grant_required)

    if actor_role in (
        MembershipRole.admin,
        MembershipRole.analyst,
        MembershipRole.viewer,
    ):
        return PermissionDecision(True, PermissionReason.allowed)

    return PermissionDecision(False, PermissionReason.role_not_allowed)


def can_export_dashboard_for_role(
    *,
    actor_role: MembershipRole,
    has_visible_dashboard_access: bool,
    asset_grants: list[AssetGrant],
    dashboard_id: UUID,
    actor_user_id: UUID | None = None,
    actor_workspace_id: UUID | None = None,
) -> PermissionDecision:
    if not has_visible_dashboard_access:
        return PermissionDecision(False, PermissionReason.grant_required)

    if actor_role == MembershipRole.external_client:
        if actor_user_id is None or actor_workspace_id is None:
            return PermissionDecision(False, PermissionReason.grant_required)
        for grant in asset_grants:
            if (
                grant.asset_type == AssetType.dashboard
                and grant.asset_id == dashboard_id
                and grant.user_id == actor_user_id
                and grant.workspace_id == actor_workspace_id
                and grant.can_export
            ):
                return PermissionDecision(True, PermissionReason.allowed)
        return PermissionDecision(False, PermissionReason.grant_required)

    if actor_role in (
        MembershipRole.admin,
        MembershipRole.analyst,
        MembershipRole.viewer,
    ):
        return PermissionDecision(True, PermissionReason.allowed)

    return PermissionDecision(False, PermissionReason.role_not_allowed)
