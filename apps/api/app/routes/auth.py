"""Auth helper endpoints for Supabase session flows."""

from __future__ import annotations

from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.admin.supabase_admin import (
    SupabaseAdmin,
    SupabaseAdminError,
    get_supabase_admin,
)
from app.auth_context.context import VerifiedSupabaseUser
from app.auth_context.dependencies import get_verified_supabase_user

router = APIRouter(tags=["auth"])


def get_supabase_admin_provider() -> Callable[[], SupabaseAdmin]:
    return get_supabase_admin


@router.post("/auth/password-reset-complete", status_code=status.HTTP_204_NO_CONTENT)
async def password_reset_complete(
    auth: Annotated[VerifiedSupabaseUser, Depends(get_verified_supabase_user)],
    supabase_admin_provider: Annotated[
        Callable[[], SupabaseAdmin],
        Depends(get_supabase_admin_provider),
    ],
) -> None:
    try:
        supabase_admin = supabase_admin_provider()
        await supabase_admin.clear_must_reset_password(user_id=auth.user_id)
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

    return None
