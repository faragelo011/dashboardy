"""Admin workspace routes (US2/US3)."""

from __future__ import annotations

from collections.abc import Callable
from typing import Annotated, NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin import asset_grants_service, members_service
from app.admin.schemas import (
    AssetGrant,
    AssetGrantListResponse,
    AssetType,
    CreateAssetGrantRequest,
    InviteMemberRequest,
    Member,
    MemberListResponse,
    UpdateMemberRequest,
)
from app.admin.supabase_admin import (
    SupabaseAdmin,
    SupabaseAdminError,
    get_supabase_admin,
)
from app.auth_context.context import VerifiedSupabaseUser
from app.auth_context.dependencies import get_verified_supabase_user
from app.common.enums import MembershipStatus
from app.db.deps import get_db
from app.tenancy import repository
from app.tenancy.resolver import ResolvedTenancy, resolve_membership_for_workspace

router = APIRouter(tags=["admin"])


def get_supabase_admin_provider() -> Callable[[], SupabaseAdmin]:
    return get_supabase_admin


def _forbidden(*, error_code: str, message: str) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={"error_code": error_code, "message": message},
    )


async def _require_active_membership(
    *,
    session: AsyncSession,
    user_id: UUID,
    workspace_id: UUID,
) -> ResolvedTenancy:
    resolved = await resolve_membership_for_workspace(
        session,
        user_id=user_id,
        workspace_id=workspace_id,
    )
    if resolved is None:
        membership = await repository.get_membership_for_user_workspace(
            session,
            user_id=user_id,
            workspace_id=workspace_id,
        )
        if membership is not None and membership.status != MembershipStatus.active:
            _forbidden(
                error_code="inactive_membership",
                message="Workspace access is inactive.",
            )
        _forbidden(error_code="no_membership", message="Workspace access is required.")
    return resolved


@router.get(
    "/workspaces/{workspace_id}/members",
    response_model=MemberListResponse,
)
async def list_workspace_members(
    workspace_id: UUID,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> MemberListResponse:
    actor = await _require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    try:
        members = await members_service.list_members(
            session=session,
            actor=actor,
            workspace_id=workspace_id,
        )
    except members_service.NotAuthorized as exc:
        _forbidden(error_code=exc.error_code, message=exc.message)
    return MemberListResponse(members=members)


@router.post(
    "/workspaces/{workspace_id}/members",
    status_code=status.HTTP_201_CREATED,
    response_model=Member,
)
async def invite_workspace_member(
    workspace_id: UUID,
    payload: InviteMemberRequest,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
    supabase_admin_provider: Annotated[
        Callable[[], SupabaseAdmin],
        Depends(get_supabase_admin_provider),
    ],
) -> Member:
    actor = await _require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    try:
        members_service.require_admin(actor)
        supabase_admin = supabase_admin_provider()
        member = await members_service.invite_member(
            session=session,
            actor=actor,
            workspace_id=workspace_id,
            email=str(payload.email),
            role=payload.role,
            supabase_admin=supabase_admin,
        )
    except members_service.NotAuthorized as exc:
        _forbidden(error_code=exc.error_code, message=exc.message)
    except SupabaseAdminError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"error_code": exc.error_code, "message": exc.message},
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error_code": "dependency_unavailable", "message": str(exc)},
        ) from exc
    except members_service.Conflict as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error_code": exc.error_code, "message": exc.message},
        ) from exc
    except members_service.ServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": exc.error_code, "message": exc.message},
        ) from exc

    await session.commit()
    return member


@router.patch(
    "/workspaces/{workspace_id}/members/{membership_id}",
    response_model=Member,
)
async def update_workspace_member(
    workspace_id: UUID,
    membership_id: UUID,
    payload: UpdateMemberRequest,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> Member:
    actor = await _require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    try:
        member = await members_service.update_member(
            session=session,
            actor=actor,
            workspace_id=workspace_id,
            membership_id=membership_id,
            role=payload.role,
            status=payload.status,
        )
    except members_service.NotAuthorized as exc:
        _forbidden(error_code=exc.error_code, message=exc.message)
    except members_service.NotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": exc.error_code, "message": exc.message},
        ) from exc

    await session.commit()
    return member


@router.get(
    "/workspaces/{workspace_id}/asset-grants",
    response_model=AssetGrantListResponse,
)
async def list_external_asset_grants(
    workspace_id: UUID,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
    user_id: UUID | None = None,
    asset_type: AssetType | None = None,
) -> AssetGrantListResponse:
    actor = await _require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    try:
        grants = await asset_grants_service.list_grants(
            session=session,
            actor=actor,
            workspace_id=workspace_id,
            user_id=user_id,
            asset_type=asset_type,
        )
    except members_service.NotAuthorized as exc:
        _forbidden(error_code=exc.error_code, message=exc.message)
    return AssetGrantListResponse(grants=grants)


@router.post(
    "/workspaces/{workspace_id}/asset-grants",
    status_code=status.HTTP_201_CREATED,
    response_model=AssetGrant,
)
async def create_external_asset_grant(
    workspace_id: UUID,
    payload: CreateAssetGrantRequest,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> AssetGrant:
    actor = await _require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    try:
        grant = await asset_grants_service.create_or_update_grant(
            session=session,
            actor=actor,
            workspace_id=workspace_id,
            user_id=payload.user_id,
            asset_type=payload.asset_type,
            asset_id=payload.asset_id,
            can_export=payload.can_export,
        )
    except members_service.NotAuthorized as exc:
        _forbidden(error_code=exc.error_code, message=exc.message)
    except asset_grants_service.NotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": exc.error_code, "message": exc.message},
        ) from exc
    except asset_grants_service.ServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": exc.error_code, "message": exc.message},
        ) from exc

    await session.commit()
    return grant


@router.delete(
    "/workspaces/{workspace_id}/asset-grants/{grant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_external_asset_grant(
    workspace_id: UUID,
    grant_id: UUID,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    actor = await _require_active_membership(
        session=session,
        user_id=auth.user_id,
        workspace_id=workspace_id,
    )
    try:
        await asset_grants_service.delete_grant(
            session=session,
            actor=actor,
            workspace_id=workspace_id,
            grant_id=grant_id,
        )
    except members_service.NotAuthorized as exc:
        _forbidden(error_code=exc.error_code, message=exc.message)
    except asset_grants_service.NotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": exc.error_code, "message": exc.message},
        ) from exc

    await session.commit()
    return None

