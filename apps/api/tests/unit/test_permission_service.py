from __future__ import annotations

import uuid

from app.models.auth_tenancy import (
    AssetGrant,
    AssetType,
    MembershipRole,
    MembershipStatus,
)
from app.tenancy.permissions import (
    PermissionReason,
    can_access_asset_via_explicit_grant,
    can_manage_members,
    can_use_collection_grant_path,
    require_active_membership_status,
    require_same_tenant,
)


def test_active_membership_required():
    assert require_active_membership_status(MembershipStatus.active).allowed is True
    d = require_active_membership_status(MembershipStatus.inactive)
    assert d.allowed is False
    assert d.reason == PermissionReason.inactive_membership


def test_tenant_mismatch():
    a = uuid.uuid4()
    b = uuid.uuid4()
    same = require_same_tenant(context_tenant_id=a, resource_tenant_id=a)
    assert same.allowed is True
    d = require_same_tenant(context_tenant_id=a, resource_tenant_id=b)
    assert d.allowed is False
    assert d.reason == PermissionReason.tenant_mismatch


def test_member_management_admin_only():
    assert can_manage_members(MembershipRole.admin).allowed is True
    non_admin = (
        MembershipRole.analyst,
        MembershipRole.viewer,
        MembershipRole.external_client,
    )
    for role in non_admin:
        d = can_manage_members(role)
        assert d.allowed is False
        assert d.reason == PermissionReason.role_not_allowed


def test_collection_grants_blocked_for_external_client():
    assert can_use_collection_grant_path(MembershipRole.analyst).allowed is True
    d = can_use_collection_grant_path(MembershipRole.external_client)
    assert d.allowed is False
    assert d.reason == PermissionReason.grant_required


def test_external_asset_grant_requires_explicit_grant():
    asset_id = uuid.uuid4()
    actor_uid = uuid.uuid4()
    actor_wid = uuid.uuid4()
    grant = AssetGrant(
        tenant_id=uuid.uuid4(),
        workspace_id=actor_wid,
        user_id=actor_uid,
        asset_type=AssetType.dashboard,
        asset_id=asset_id,
        can_export=False,
        created_by_membership_id=uuid.uuid4(),
    )

    assert (
        can_access_asset_via_explicit_grant(
            actor_role=MembershipRole.analyst,
            asset_type=AssetType.dashboard,
            asset_id=asset_id,
            grants=[grant],
        ).allowed
        is True
    )

    d = can_access_asset_via_explicit_grant(
        actor_role=MembershipRole.external_client,
        actor_user_id=actor_uid,
        actor_workspace_id=actor_wid,
        asset_type=AssetType.dashboard,
        asset_id=asset_id,
        grants=[],
    )
    assert d.allowed is False
    assert d.reason == PermissionReason.grant_required

    assert (
        can_access_asset_via_explicit_grant(
            actor_role=MembershipRole.external_client,
            actor_user_id=actor_uid,
            actor_workspace_id=actor_wid,
            asset_type=AssetType.dashboard,
            asset_id=asset_id,
            grants=[grant],
        ).allowed
        is True
    )


def test_external_asset_grant_requires_matching_asset_type():
    asset_id = uuid.uuid4()
    actor_uid = uuid.uuid4()
    actor_wid = uuid.uuid4()
    grant = AssetGrant(
        tenant_id=uuid.uuid4(),
        workspace_id=actor_wid,
        user_id=actor_uid,
        asset_type=AssetType.dashboard,
        asset_id=asset_id,
        can_export=False,
        created_by_membership_id=uuid.uuid4(),
    )

    d = can_access_asset_via_explicit_grant(
        actor_role=MembershipRole.external_client,
        actor_user_id=actor_uid,
        actor_workspace_id=actor_wid,
        asset_type=AssetType.question,
        asset_id=asset_id,
        grants=[grant],
    )
    assert d.allowed is False
    assert d.reason == PermissionReason.grant_required


def test_external_asset_grant_requires_matching_asset_id():
    grant_asset_id = uuid.uuid4()
    other_asset_id = uuid.uuid4()
    actor_uid = uuid.uuid4()
    actor_wid = uuid.uuid4()
    grant = AssetGrant(
        tenant_id=uuid.uuid4(),
        workspace_id=actor_wid,
        user_id=actor_uid,
        asset_type=AssetType.dashboard,
        asset_id=grant_asset_id,
        can_export=False,
        created_by_membership_id=uuid.uuid4(),
    )

    d = can_access_asset_via_explicit_grant(
        actor_role=MembershipRole.external_client,
        actor_user_id=actor_uid,
        actor_workspace_id=actor_wid,
        asset_type=AssetType.dashboard,
        asset_id=other_asset_id,
        grants=[grant],
    )
    assert d.allowed is False
    assert d.reason == PermissionReason.grant_required


def test_external_asset_grant_requires_matching_user_and_workspace():
    asset_id = uuid.uuid4()
    grant_user = uuid.uuid4()
    grant_ws = uuid.uuid4()
    other_user = uuid.uuid4()
    grant = AssetGrant(
        tenant_id=uuid.uuid4(),
        workspace_id=grant_ws,
        user_id=grant_user,
        asset_type=AssetType.dashboard,
        asset_id=asset_id,
        can_export=False,
        created_by_membership_id=uuid.uuid4(),
    )

    d = can_access_asset_via_explicit_grant(
        actor_role=MembershipRole.external_client,
        actor_user_id=other_user,
        actor_workspace_id=grant_ws,
        asset_type=AssetType.dashboard,
        asset_id=asset_id,
        grants=[grant],
    )
    assert d.allowed is False
    assert d.reason == PermissionReason.grant_required
