"""POST /workspaces/switch — MVP no-op/stub (US4).

MVP supports one workspace per tenant. The switch endpoint accepts the current
workspace id and returns the same resolved context. Attempts to switch to any
other workspace id are denied.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth_context.context import VerifiedSupabaseUser
from app.auth_context.dependencies import get_verified_supabase_user
from app.auth_context.schemas import MeResponse
from app.common.enums import MembershipStatus
from app.db.deps import get_db
from app.routes.me import build_me_response
from app.tenancy import repository
from app.tenancy.resolver import resolve_active_membership

router = APIRouter(tags=["workspaces"])


class SwitchWorkspaceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workspace_id: UUID


@router.post("/workspaces/switch", response_model=MeResponse)
async def switch_workspace(
    payload: SwitchWorkspaceRequest,
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> MeResponse:
    resolved = await resolve_active_membership(session, auth.user_id)
    if resolved is not None:
        if payload.workspace_id != resolved.workspace_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error_code": "authz_denied",
                    "message": "You do not have permission to perform this action.",
                },
            )
        return build_me_response(
            user_id=auth.user_id,
            jwt_payload=auth.jwt_payload,
            resolved=resolved,
        )

    memberships = await repository.list_memberships_for_user(session, auth.user_id)
    if any(m.status == MembershipStatus.inactive for m in memberships):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error_code": "inactive_membership",
                "message": "Workspace access is inactive.",
            },
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "error_code": "no_membership",
            "message": "Workspace access is required.",
        },
    )

