"""FastAPI dependencies for authentication."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth_context.context import InvalidJwtError, VerifiedSupabaseUser
from app.auth_context.jwt import decode_supabase_jwt, verify_supabase_jwt

_http_bearer = HTTPBearer(auto_error=False)


def get_bearer_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_http_bearer)],
) -> str:
    if (
        credentials is None
        or credentials.scheme.lower() != "bearer"
        or not credentials.credentials.strip()
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "auth_required", "message": "Sign in is required."},
        )
    return credentials.credentials


def get_current_user_id(token: Annotated[str, Depends(get_bearer_token)]) -> UUID:
    """Return the authenticated Supabase user id or raise 401."""

    try:
        return verify_supabase_jwt(token)
    except InvalidJwtError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "auth_required", "message": "Sign in is required."},
        ) from exc


def get_verified_supabase_user(
    token: Annotated[str, Depends(get_bearer_token)],
) -> VerifiedSupabaseUser:
    """Return verified user id and JWT payload (single decode) for `/me`."""

    try:
        payload = decode_supabase_jwt(token)
    except InvalidJwtError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "auth_required", "message": "Sign in is required."},
        ) from exc

    sub = payload.get("sub")
    if not isinstance(sub, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "auth_required", "message": "Sign in is required."},
        )
    try:
        user_id = UUID(sub)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "auth_required", "message": "Sign in is required."},
        ) from exc

    return VerifiedSupabaseUser(user_id=user_id, jwt_payload=payload)
