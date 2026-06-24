"""Authorization helpers for saved questions and collections (Feature 005)."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.models.auth_tenancy import (
    AssetGrant,
    CollectionPermission,
    MembershipRole,
)
from app.questions.schemas import GrantPermission
from app.tenancy.permissions import (
    PermissionReason,
    can_export_saved_question_for_role,
    internal_author_has_implicit_edit,
    resolve_external_client_question_asset_grant,
    resolve_internal_collection_grant_access,
    resolve_internal_question_grant_access,
    widen_grant_permission,
)


@dataclass(frozen=True, slots=True)
class QuestionsAuthzDecision:
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


def effective_collection_permission(
    *,
    actor_role: MembershipRole,
    collection_grant: CollectionPermission | None,
) -> GrantPermission | None:
    if internal_author_has_implicit_edit(actor_role):
        return GrantPermission.edit
    return _collection_perm_to_grant(collection_grant)


def effective_question_permission(
    *,
    actor_role: MembershipRole,
    collection_grant: CollectionPermission | None,
    question_grant: CollectionPermission | None,
) -> GrantPermission | None:
    if internal_author_has_implicit_edit(actor_role):
        return GrantPermission.edit
    return widen_grant_permission(
        collection_permission=_collection_perm_to_grant(collection_grant),
        question_permission=_collection_perm_to_grant(question_grant),
    )


def can_view_collection(
    *,
    actor_role: MembershipRole,
    collection_grant: CollectionPermission | None,
) -> QuestionsAuthzDecision:
    if actor_role == MembershipRole.external_client:
        return QuestionsAuthzDecision(False, PermissionReason.grant_required)
    decision = resolve_internal_collection_grant_access(
        actor_role=actor_role,
        collection_permission=collection_grant,
    )
    if not decision.allowed:
        return QuestionsAuthzDecision(False, decision.reason)
    return QuestionsAuthzDecision(
        True,
        PermissionReason.allowed,
        effective_permission=effective_collection_permission(
            actor_role=actor_role,
            collection_grant=collection_grant,
        ),
    )


def can_edit_collection(
    *,
    actor_role: MembershipRole,
    collection_grant: CollectionPermission | None,
) -> QuestionsAuthzDecision:
    view = can_view_collection(
        actor_role=actor_role,
        collection_grant=collection_grant,
    )
    if not view.allowed:
        return view
    if view.effective_permission != GrantPermission.edit:
        return QuestionsAuthzDecision(False, PermissionReason.grant_required)
    return view


def can_view_question(
    *,
    actor_role: MembershipRole,
    actor_user_id: UUID | None,
    actor_workspace_id: UUID | None,
    question_id: UUID,
    collection_grant: CollectionPermission | None,
    question_grant: CollectionPermission | None,
    asset_grants: list[AssetGrant],
) -> QuestionsAuthzDecision:
    if actor_role == MembershipRole.external_client:
        decision = resolve_external_client_question_asset_grant(
            actor_role=actor_role,
            actor_user_id=actor_user_id,
            actor_workspace_id=actor_workspace_id,
            question_id=question_id,
            grants=asset_grants,
        )
        if not decision.allowed:
            return QuestionsAuthzDecision(False, decision.reason)
        can_export = can_export_saved_question_for_role(
            actor_role=actor_role,
            has_visible_question_access=True,
            asset_grants=asset_grants,
            question_id=question_id,
            actor_user_id=actor_user_id,
            actor_workspace_id=actor_workspace_id,
        ).allowed
        return QuestionsAuthzDecision(
            True,
            PermissionReason.allowed,
            effective_permission=GrantPermission.view,
            can_export=can_export,
        )

    decision = resolve_internal_question_grant_access(
        actor_role=actor_role,
        collection_permission=collection_grant,
        question_permission=question_grant,
    )
    if not decision.allowed:
        return QuestionsAuthzDecision(False, decision.reason)

    effective = effective_question_permission(
        actor_role=actor_role,
        collection_grant=collection_grant,
        question_grant=question_grant,
    )
    can_export = can_export_saved_question_for_role(
        actor_role=actor_role,
        has_visible_question_access=True,
        asset_grants=asset_grants,
        question_id=question_id,
        actor_user_id=actor_user_id,
        actor_workspace_id=actor_workspace_id,
    ).allowed
    return QuestionsAuthzDecision(
        True,
        PermissionReason.allowed,
        effective_permission=effective,
        can_export=can_export,
    )


def can_edit_question(
    *,
    actor_role: MembershipRole,
    actor_user_id: UUID | None,
    actor_workspace_id: UUID | None,
    question_id: UUID,
    collection_grant: CollectionPermission | None,
    question_grant: CollectionPermission | None,
    asset_grants: list[AssetGrant],
) -> QuestionsAuthzDecision:
    view = can_view_question(
        actor_role=actor_role,
        actor_user_id=actor_user_id,
        actor_workspace_id=actor_workspace_id,
        question_id=question_id,
        collection_grant=collection_grant,
        question_grant=question_grant,
        asset_grants=asset_grants,
    )
    if not view.allowed:
        return view
    if view.effective_permission != GrantPermission.edit:
        return QuestionsAuthzDecision(False, PermissionReason.grant_required)
    return view


def can_execute_question(
    *,
    actor_role: MembershipRole,
    actor_user_id: UUID | None,
    actor_workspace_id: UUID | None,
    question_id: UUID,
    collection_grant: CollectionPermission | None,
    question_grant: CollectionPermission | None,
    asset_grants: list[AssetGrant],
) -> QuestionsAuthzDecision:
    return can_view_question(
        actor_role=actor_role,
        actor_user_id=actor_user_id,
        actor_workspace_id=actor_workspace_id,
        question_id=question_id,
        collection_grant=collection_grant,
        question_grant=question_grant,
        asset_grants=asset_grants,
    )


def can_clone_question(
    *,
    actor_role: MembershipRole,
    source_collection_grant: CollectionPermission | None,
    source_question_grant: CollectionPermission | None,
    target_collection_grant: CollectionPermission | None,
    actor_user_id: UUID | None = None,
    actor_workspace_id: UUID | None = None,
    question_id: UUID | None = None,
    asset_grants: list[AssetGrant] | None = None,
) -> QuestionsAuthzDecision:
    if actor_role == MembershipRole.external_client:
        return QuestionsAuthzDecision(False, PermissionReason.grant_required)

    source_view = resolve_internal_question_grant_access(
        actor_role=actor_role,
        collection_permission=source_collection_grant,
        question_permission=source_question_grant,
    )
    if not source_view.allowed:
        return QuestionsAuthzDecision(False, source_view.reason)

    target_edit = can_edit_collection(
        actor_role=actor_role,
        collection_grant=target_collection_grant,
    )
    if not target_edit.allowed:
        return QuestionsAuthzDecision(False, target_edit.reason)
    return QuestionsAuthzDecision(True, PermissionReason.allowed)


def can_export_question(
    *,
    actor_role: MembershipRole,
    actor_user_id: UUID | None,
    actor_workspace_id: UUID | None,
    question_id: UUID,
    collection_grant: CollectionPermission | None,
    question_grant: CollectionPermission | None,
    asset_grants: list[AssetGrant],
) -> QuestionsAuthzDecision:
    view = can_view_question(
        actor_role=actor_role,
        actor_user_id=actor_user_id,
        actor_workspace_id=actor_workspace_id,
        question_id=question_id,
        collection_grant=collection_grant,
        question_grant=question_grant,
        asset_grants=asset_grants,
    )
    if not view.allowed:
        return QuestionsAuthzDecision(False, view.reason)

    export = can_export_saved_question_for_role(
        actor_role=actor_role,
        has_visible_question_access=True,
        asset_grants=asset_grants,
        question_id=question_id,
        actor_user_id=actor_user_id,
        actor_workspace_id=actor_workspace_id,
    )
    if not export.allowed:
        return QuestionsAuthzDecision(False, export.reason)
    return QuestionsAuthzDecision(
        True,
        PermissionReason.allowed,
        effective_permission=view.effective_permission,
        can_export=True,
    )
