"""Admin workspace routes (US2/US3)."""

from __future__ import annotations

from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin import members_service
from app.admin.schemas import (
    InviteMemberRequest,
    Member,
    MemberListResponse,
    UpdateMemberRequest,
)
from app.admin.supabase_admin import SupabaseAdmin, get_supabase_admin
from app.auth_context.context import VerifiedSupabaseUser
from app.auth_context.dependencies import get_verified_supabase_user
from app.common.enums import MembershipStatus
from app.db.deps import get_db
from app.tenancy import repository
from app.tenancy.resolver import resolve_membership_for_workspace

router = APIRouter(tags=["admin"])


def get_supabase_admin_provider() -> Callable[[], SupabaseAdmin]:
    return get_supabase_admin


def _forbidden(*, error_code: str, message: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={"error_code": error_code, "message": message},
    )


async def _require_active_membership(
    *,
    session: AsyncSession,
    user_id: UUID,
    workspace_id: UUID,
):
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

