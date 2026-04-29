"""Admin external asset-grant management service (US3)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.schemas import AssetGrant as AssetGrantSchema
from app.admin.schemas import AssetType as AssetTypeSchema
from app.common.enums import MembershipRole, MembershipStatus
from app.models.auth_tenancy import AssetGrant, AssetType
from app.tenancy import repository
from app.tenancy.resolver import ResolvedTenancy

from . import members_service


class ServiceError(Exception):
    def __init__(self, *, error_code: str, message: str) -> None:
        super().__init__(message)
        self.error_code = error_code
        self.message = message


class NotAuthorized(ServiceError):
    pass


class NotFound(ServiceError):
    pass


def _to_asset_type(value: AssetTypeSchema) -> AssetType:
    return AssetType(value.value)


def _require_actor_workspace(actor: ResolvedTenancy, workspace_id: UUID) -> None:
    if workspace_id != actor.workspace_id:
        raise members_service.NotAuthorized(
            error_code="authz_denied",
            message="You do not have permission to perform this action.",
        )


def _to_schema(row: AssetGrant) -> AssetGrantSchema:
    return AssetGrantSchema(
        id=row.id,
        user_id=row.user_id,
        asset_type=AssetTypeSchema(row.asset_type.value),
        asset_id=row.asset_id,
        can_export=bool(row.can_export),
        created_at=row.created_at,
    )


async def list_grants(
    *,
    session: AsyncSession,
    actor: ResolvedTenancy,
    workspace_id: UUID,
    user_id: UUID | None = None,
    asset_type: AssetTypeSchema | None = None,
) -> list[AssetGrantSchema]:
    members_service.require_admin(actor)
    _require_actor_workspace(actor, workspace_id)
    rows = await repository.list_asset_grants_for_workspace(
        session,
        workspace_id=workspace_id,
        user_id=user_id,
        asset_type=_to_asset_type(asset_type) if asset_type is not None else None,
    )
    return [_to_schema(r) for r in rows]


async def create_or_update_grant(
    *,
    session: AsyncSession,
    actor: ResolvedTenancy,
    workspace_id: UUID,
    user_id: UUID,
    asset_type: AssetTypeSchema,
    asset_id: UUID,
    can_export: bool = False,
) -> AssetGrantSchema:
    members_service.require_admin(actor)
    _require_actor_workspace(actor, workspace_id)

    target = await repository.get_membership_for_workspace_by_user_id(
        session,
        workspace_id=workspace_id,
        user_id=user_id,
    )
    if (
        target is None
        or target.status != MembershipStatus.active
        or target.role != MembershipRole.external_client
    ):
        raise ServiceError(
            error_code="bad_request",
            message="Target user must be an active external_client workspace member.",
        )

    model_asset_type = _to_asset_type(asset_type)
    existing = await repository.get_asset_grant_for_workspace_by_unique(
        session,
        workspace_id=workspace_id,
        user_id=user_id,
        asset_type=model_asset_type,
        asset_id=asset_id,
    )
    if existing is None:
        try:
            created = await repository.create_asset_grant(
                session,
                tenant_id=actor.tenant_id,
                workspace_id=workspace_id,
                user_id=user_id,
                asset_type=model_asset_type,
                asset_id=asset_id,
                can_export=bool(can_export),
                created_by_membership_id=actor.membership_id,
            )
            return _to_schema(created)
        except IntegrityError:
            await session.rollback()
            raced = await repository.get_asset_grant_for_workspace_by_unique(
                session,
                workspace_id=workspace_id,
                user_id=user_id,
                asset_type=model_asset_type,
                asset_id=asset_id,
            )
            if raced is None:
                raise
            requested_can_export = bool(can_export)
            if bool(raced.can_export) != requested_can_export:
                updated = await repository.set_asset_grant_can_export(
                    session,
                    workspace_id=workspace_id,
                    grant_id=raced.id,
                    can_export=requested_can_export,
                )
                if updated is None:
                    raise NotFound(error_code="not_found", message="Grant not found.")
                return _to_schema(updated)
            return _to_schema(raced)

    updated = await repository.set_asset_grant_can_export(
        session,
        workspace_id=workspace_id,
        grant_id=existing.id,
        can_export=bool(can_export),
    )
    if updated is None:
        raise NotFound(error_code="not_found", message="Grant not found.")
    return _to_schema(updated)


async def delete_grant(
    *,
    session: AsyncSession,
    actor: ResolvedTenancy,
    workspace_id: UUID,
    grant_id: UUID,
) -> None:
    members_service.require_admin(actor)
    _require_actor_workspace(actor, workspace_id)
    deleted = await repository.delete_asset_grant(
        session,
        workspace_id=workspace_id,
        grant_id=grant_id,
    )
    if not deleted:
        raise NotFound(error_code="not_found", message="Grant not found.")

