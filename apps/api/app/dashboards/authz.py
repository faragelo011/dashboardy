"""Authorization helpers for dashboards (Feature 006)."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.dashboards.schemas import GrantPermission
from app.models.auth_tenancy import AssetGrant, CollectionPermission, MembershipRole
from app.tenancy.permissions import (
    PermissionReason,
    can_export_dashboard_for_role,
    internal_author_has_implicit_edit,
    resolve_external_client_dashboard_asset_grant,
    resolve_internal_dashboard_grant_access,
    widen_grant_permission,
)


@dataclass(frozen=True, slots=True)
class DashboardsAuthzDecision:
    allowed: bool
    reason: PermissionReason
    effective_permission: GrantPermission | None = None
    can_export: bool = False


def _collection_perm_to_grant(
    permission: CollectionPermission | None,
) -> GrantPermission | None:
    if permission is None:
        return None
    if permission == CollectionPermission.edit:
        return GrantPermission.edit
    return GrantPermission.view


def effective_dashboard_permission(
    *,
    actor_role: MembershipRole,
    collection_grant: CollectionPermission | None,
    dashboard_grant: CollectionPermission | None,
) -> GrantPermission | None:
    if internal_author_has_implicit_edit(actor_role):
        return GrantPermission.edit
    widened = widen_grant_permission(
        collection_permission=collection_grant,
        question_permission=dashboard_grant,
    )
    return _collection_perm_to_grant(widened)


def can_view_dashboard(
    *,
    actor_role: MembershipRole,
    actor_user_id: UUID | None,
    actor_workspace_id: UUID | None,
    dashboard_id: UUID,
    collection_grant: CollectionPermission | None,
    dashboard_grant: CollectionPermission | None,
    asset_grants: list[AssetGrant],
) -> DashboardsAuthzDecision:
    if actor_role == MembershipRole.external_client:
        decision = resolve_external_client_dashboard_asset_grant(
            actor_role=actor_role,
            actor_user_id=actor_user_id,
            actor_workspace_id=actor_workspace_id,
            dashboard_id=dashboard_id,
            grants=asset_grants,
        )
        if not decision.allowed:
            return DashboardsAuthzDecision(False, decision.reason)
        can_export = can_export_dashboard_for_role(
            actor_role=actor_role,
            has_visible_dashboard_access=True,
            asset_grants=asset_grants,
            dashboard_id=dashboard_id,
            actor_user_id=actor_user_id,
            actor_workspace_id=actor_workspace_id,
        ).allowed
        return DashboardsAuthzDecision(
            True,
            PermissionReason.allowed,
            effective_permission=GrantPermission.view,
            can_export=can_export,
        )

    decision = resolve_internal_dashboard_grant_access(
        actor_role=actor_role,
        collection_permission=collection_grant,
        dashboard_permission=dashboard_grant,
    )
    if not decision.allowed:
        return DashboardsAuthzDecision(False, decision.reason)

    effective = effective_dashboard_permission(
        actor_role=actor_role,
        collection_grant=collection_grant,
        dashboard_grant=dashboard_grant,
    )
    can_export = can_export_dashboard_for_role(
        actor_role=actor_role,
        has_visible_dashboard_access=True,
        asset_grants=asset_grants,
        dashboard_id=dashboard_id,
        actor_user_id=actor_user_id,
        actor_workspace_id=actor_workspace_id,
    ).allowed
    return DashboardsAuthzDecision(
        True,
        PermissionReason.allowed,
        effective_permission=effective,
        can_export=can_export,
    )


def can_edit_dashboard(
    *,
    actor_role: MembershipRole,
    actor_user_id: UUID | None,
    actor_workspace_id: UUID | None,
    dashboard_id: UUID,
    collection_grant: CollectionPermission | None,
    dashboard_grant: CollectionPermission | None,
    asset_grants: list[AssetGrant],
) -> DashboardsAuthzDecision:
    view = can_view_dashboard(
        actor_role=actor_role,
        actor_user_id=actor_user_id,
        actor_workspace_id=actor_workspace_id,
        dashboard_id=dashboard_id,
        collection_grant=collection_grant,
        dashboard_grant=dashboard_grant,
        asset_grants=asset_grants,
    )
    if not view.allowed:
        return view
    if view.effective_permission != GrantPermission.edit:
        return DashboardsAuthzDecision(False, PermissionReason.grant_required)
    return view


def can_execute_dashboard(
    *,
    actor_role: MembershipRole,
    actor_user_id: UUID | None,
    actor_workspace_id: UUID | None,
    dashboard_id: UUID,
    collection_grant: CollectionPermission | None,
    dashboard_grant: CollectionPermission | None,
    asset_grants: list[AssetGrant],
) -> DashboardsAuthzDecision:
    return can_view_dashboard(
        actor_role=actor_role,
        actor_user_id=actor_user_id,
        actor_workspace_id=actor_workspace_id,
        dashboard_id=dashboard_id,
        collection_grant=collection_grant,
        dashboard_grant=dashboard_grant,
        asset_grants=asset_grants,
    )


def can_clone_dashboard(
    *,
    actor_role: MembershipRole,
    source_collection_grant: CollectionPermission | None,
    source_dashboard_grant: CollectionPermission | None,
    target_collection_grant: CollectionPermission | None,
) -> DashboardsAuthzDecision:
    if not internal_author_has_implicit_edit(actor_role):
        return DashboardsAuthzDecision(False, PermissionReason.grant_required)

    source_view = resolve_internal_dashboard_grant_access(
        actor_role=actor_role,
        collection_permission=source_collection_grant,
        dashboard_permission=source_dashboard_grant,
    )
    if not source_view.allowed:
        return DashboardsAuthzDecision(False, source_view.reason)

    if internal_author_has_implicit_edit(actor_role):
        target_allowed = True
    elif target_collection_grant == CollectionPermission.edit:
        target_allowed = True
    else:
        target_allowed = False

    if not target_allowed:
        return DashboardsAuthzDecision(False, PermissionReason.grant_required)
    return DashboardsAuthzDecision(True, PermissionReason.allowed)


def can_export_dashboard(
    *,
    actor_role: MembershipRole,
    actor_user_id: UUID | None,
    actor_workspace_id: UUID | None,
    dashboard_id: UUID,
    collection_grant: CollectionPermission | None,
    dashboard_grant: CollectionPermission | None,
    asset_grants: list[AssetGrant],
) -> DashboardsAuthzDecision:
    view = can_view_dashboard(
        actor_role=actor_role,
        actor_user_id=actor_user_id,
        actor_workspace_id=actor_workspace_id,
        dashboard_id=dashboard_id,
        collection_grant=collection_grant,
        dashboard_grant=dashboard_grant,
        asset_grants=asset_grants,
    )
    if not view.allowed:
        return view

    export = can_export_dashboard_for_role(
        actor_role=actor_role,
        has_visible_dashboard_access=True,
        asset_grants=asset_grants,
        dashboard_id=dashboard_id,
        actor_user_id=actor_user_id,
        actor_workspace_id=actor_workspace_id,
    )
    if not export.allowed:
        return DashboardsAuthzDecision(False, export.reason)
    return DashboardsAuthzDecision(
        True,
        PermissionReason.allowed,
        effective_permission=view.effective_permission,
        can_export=True,
    )
