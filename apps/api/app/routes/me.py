"""GET /me — resolve authenticated user and active workspace membership (US1)."""

from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import EmailStr, TypeAdapter
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth_context.context import VerifiedSupabaseUser
from app.auth_context.dependencies import get_verified_supabase_user
from app.auth_context.schemas import MeResponse, UserContext, WorkspaceContext
from app.common.enums import MembershipStatus
from app.db.deps import get_db
from app.tenancy import repository
from app.tenancy.resolver import ResolvedTenancy, resolve_active_membership

router = APIRouter(tags=["me"])

_email_adapter = TypeAdapter(EmailStr)


def _user_email_from_jwt(*, user_id: UUID, jwt_payload: dict[str, Any]) -> EmailStr:
    raw = jwt_payload.get("email")
    if isinstance(raw, str) and raw.strip():
        return _email_adapter.validate_python(raw.strip())
    # Synthetic placeholder when Supabase omits `email` in access token claims.
    return _email_adapter.validate_python(f"user+{user_id.hex[:20]}@example.com")


def build_me_response(
    *,
    user_id: UUID,
    jwt_payload: dict[str, Any],
    resolved: ResolvedTenancy,
) -> MeResponse:
    workspace_ctx = WorkspaceContext(
        tenant_id=resolved.tenant_id,
        workspace_id=resolved.workspace_id,
        workspace_name=resolved.workspace_name,
        role=resolved.role,
        membership_status=resolved.membership_status,
    )
    email = _user_email_from_jwt(user_id=user_id, jwt_payload=jwt_payload)
    return MeResponse(
        user=UserContext(id=user_id, email=email),
        current_workspace=workspace_ctx,
        workspaces=[workspace_ctx],
    )


@router.get("/me", response_model=MeResponse)
async def get_me(
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> MeResponse:
    resolved = await resolve_active_membership(session, auth.user_id)
    if resolved is not None:
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
