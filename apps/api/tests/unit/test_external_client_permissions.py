from __future__ import annotations

import uuid

from app.models.auth_tenancy import AssetGrant, AssetType, MembershipRole
from app.tenancy.permissions import (
    PermissionReason,
    can_access_asset_via_explicit_grant,
    can_access_dashboard_via_grant,
    can_access_question_via_grant,
    can_use_collection_grant_path,
)


def test_external_client_never_uses_collection_grant_path():
    d = can_use_collection_grant_path(MembershipRole.external_client)
    assert d.allowed is False
    assert d.reason == PermissionReason.grant_required


def test_external_client_allows_only_explicit_asset_grants():
    actor_user_id = uuid.uuid4()
    actor_workspace_id = uuid.uuid4()
    asset_id = uuid.uuid4()

    allowed_grant = AssetGrant(
        tenant_id=uuid.uuid4(),
        workspace_id=actor_workspace_id,
        user_id=actor_user_id,
        asset_type=AssetType.question,
        asset_id=asset_id,
        can_export=False,
        created_by_membership_id=uuid.uuid4(),
    )

    denied = can_access_asset_via_explicit_grant(
        actor_role=MembershipRole.external_client,
        actor_user_id=actor_user_id,
        actor_workspace_id=actor_workspace_id,
        asset_type=AssetType.question,
        asset_id=asset_id,
        grants=[],
    )
    assert denied.allowed is False
    assert denied.reason == PermissionReason.grant_required

    ok = can_access_asset_via_explicit_grant(
        actor_role=MembershipRole.external_client,
        actor_user_id=actor_user_id,
        actor_workspace_id=actor_workspace_id,
        asset_type=AssetType.question,
        asset_id=asset_id,
        grants=[allowed_grant],
    )
    assert ok.allowed is True


def test_external_client_denies_mismatched_asset_grants():
    actor_user_id = uuid.uuid4()
    actor_workspace_id = uuid.uuid4()
    asset_id = uuid.uuid4()

    mismatched_grants = [
        AssetGrant(
            tenant_id=uuid.uuid4(),
            workspace_id=actor_workspace_id,
            user_id=actor_user_id,
            asset_type=AssetType.question,
            asset_id=uuid.uuid4(),
            can_export=False,
            created_by_membership_id=uuid.uuid4(),
        ),
        AssetGrant(
            tenant_id=uuid.uuid4(),
            workspace_id=actor_workspace_id,
            user_id=actor_user_id,
            asset_type=AssetType.dashboard,
            asset_id=asset_id,
            can_export=False,
            created_by_membership_id=uuid.uuid4(),
        ),
        AssetGrant(
            tenant_id=uuid.uuid4(),
            workspace_id=actor_workspace_id,
            user_id=uuid.uuid4(),
            asset_type=AssetType.question,
            asset_id=asset_id,
            can_export=False,
            created_by_membership_id=uuid.uuid4(),
        ),
        AssetGrant(
            tenant_id=uuid.uuid4(),
            workspace_id=uuid.uuid4(),
            user_id=actor_user_id,
            asset_type=AssetType.question,
            asset_id=asset_id,
            can_export=False,
            created_by_membership_id=uuid.uuid4(),
        ),
    ]

    denied = can_access_asset_via_explicit_grant(
        actor_role=MembershipRole.external_client,
        actor_user_id=actor_user_id,
        actor_workspace_id=actor_workspace_id,
        asset_type=AssetType.question,
        asset_id=asset_id,
        grants=mismatched_grants,
    )
    assert denied.allowed is False
    assert denied.reason == PermissionReason.grant_required


def test_external_client_question_grant_wrapper_allows_only_matching_question():
    actor_user_id = uuid.uuid4()
    actor_workspace_id = uuid.uuid4()
    question_id = uuid.uuid4()

    assert (
        can_access_question_via_grant(
            actor_role=MembershipRole.external_client,
            actor_user_id=actor_user_id,
            actor_workspace_id=actor_workspace_id,
            question_id=question_id,
            grants=[],
        ).reason
        == PermissionReason.grant_required
    )

    matching = AssetGrant(
        tenant_id=uuid.uuid4(),
        workspace_id=actor_workspace_id,
        user_id=actor_user_id,
        asset_type=AssetType.question,
        asset_id=question_id,
        can_export=False,
        created_by_membership_id=uuid.uuid4(),
    )
    assert (
        can_access_question_via_grant(
            actor_role=MembershipRole.external_client,
            actor_user_id=actor_user_id,
            actor_workspace_id=actor_workspace_id,
            question_id=question_id,
            grants=[matching],
        ).allowed
        is True
    )

    mismatched = [
        AssetGrant(
            tenant_id=uuid.uuid4(),
            workspace_id=actor_workspace_id,
            user_id=actor_user_id,
            asset_type=AssetType.dashboard,
            asset_id=question_id,
            can_export=False,
            created_by_membership_id=uuid.uuid4(),
        ),
        AssetGrant(
            tenant_id=uuid.uuid4(),
            workspace_id=actor_workspace_id,
            user_id=actor_user_id,
            asset_type=AssetType.question,
            asset_id=uuid.uuid4(),
            can_export=False,
            created_by_membership_id=uuid.uuid4(),
        ),
        AssetGrant(
            tenant_id=uuid.uuid4(),
            workspace_id=actor_workspace_id,
            user_id=uuid.uuid4(),
            asset_type=AssetType.question,
            asset_id=question_id,
            can_export=False,
            created_by_membership_id=uuid.uuid4(),
        ),
        AssetGrant(
            tenant_id=uuid.uuid4(),
            workspace_id=uuid.uuid4(),
            user_id=actor_user_id,
            asset_type=AssetType.question,
            asset_id=question_id,
            can_export=False,
            created_by_membership_id=uuid.uuid4(),
        ),
    ]
    denied = can_access_question_via_grant(
        actor_role=MembershipRole.external_client,
        actor_user_id=actor_user_id,
        actor_workspace_id=actor_workspace_id,
        question_id=question_id,
        grants=mismatched,
    )
    assert denied.allowed is False
    assert denied.reason == PermissionReason.grant_required


def test_external_client_dashboard_grant_wrapper_allows_only_matching_dashboard():
    actor_user_id = uuid.uuid4()
    actor_workspace_id = uuid.uuid4()
    dashboard_id = uuid.uuid4()

    assert (
        can_access_dashboard_via_grant(
            actor_role=MembershipRole.external_client,
            actor_user_id=actor_user_id,
            actor_workspace_id=actor_workspace_id,
            dashboard_id=dashboard_id,
            grants=[],
        ).reason
        == PermissionReason.grant_required
    )

    matching = AssetGrant(
        tenant_id=uuid.uuid4(),
        workspace_id=actor_workspace_id,
        user_id=actor_user_id,
        asset_type=AssetType.dashboard,
        asset_id=dashboard_id,
        can_export=False,
        created_by_membership_id=uuid.uuid4(),
    )
    assert (
        can_access_dashboard_via_grant(
            actor_role=MembershipRole.external_client,
            actor_user_id=actor_user_id,
            actor_workspace_id=actor_workspace_id,
            dashboard_id=dashboard_id,
            grants=[matching],
        ).allowed
        is True
    )

    mismatched = [
        AssetGrant(
            tenant_id=uuid.uuid4(),
            workspace_id=actor_workspace_id,
            user_id=actor_user_id,
            asset_type=AssetType.question,
            asset_id=dashboard_id,
            can_export=False,
            created_by_membership_id=uuid.uuid4(),
        ),
        AssetGrant(
            tenant_id=uuid.uuid4(),
            workspace_id=actor_workspace_id,
            user_id=actor_user_id,
            asset_type=AssetType.dashboard,
            asset_id=uuid.uuid4(),
            can_export=False,
            created_by_membership_id=uuid.uuid4(),
        ),
        AssetGrant(
            tenant_id=uuid.uuid4(),
            workspace_id=actor_workspace_id,
            user_id=uuid.uuid4(),
            asset_type=AssetType.dashboard,
            asset_id=dashboard_id,
            can_export=False,
            created_by_membership_id=uuid.uuid4(),
        ),
        AssetGrant(
            tenant_id=uuid.uuid4(),
            workspace_id=uuid.uuid4(),
            user_id=actor_user_id,
            asset_type=AssetType.dashboard,
            asset_id=dashboard_id,
            can_export=False,
            created_by_membership_id=uuid.uuid4(),
        ),
    ]
    denied = can_access_dashboard_via_grant(
        actor_role=MembershipRole.external_client,
        actor_user_id=actor_user_id,
        actor_workspace_id=actor_workspace_id,
        dashboard_id=dashboard_id,
        grants=mismatched,
    )
    assert denied.allowed is False
    assert denied.reason == PermissionReason.grant_required

