"""FastAPI dependencies for authentication."""

from __future__ import annotations

import logging
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth_context.context import InvalidJwtError, VerifiedSupabaseUser
from app.auth_context.jwt import decode_supabase_jwt, verify_supabase_jwt

logger = logging.getLogger(__name__)
_http_bearer = HTTPBearer(auto_error=False)


def _raise_auth_required() -> None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"error_code": "auth_required", "message": "Sign in is required."},
    )


def get_bearer_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_http_bearer)],
) -> str:
    if (
        credentials is None
        or credentials.scheme.lower() != "bearer"
        or not credentials.credentials.strip()
    ):
        logger.info(
            "Authorization header missing/invalid (scheme=%s, has_credentials=%s)",
            getattr(credentials, "scheme", None),
            bool(getattr(credentials, "credentials", "") or ""),
        )
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
        # Never log tokens. Only log the failure reason to aid local debugging.
        logger.info("Supabase JWT rejected: %s", str(exc))
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
        logger.info("Supabase JWT rejected while decoding payload: %s", str(exc))
        _raise_auth_required()

    sub = payload.get("sub")
    if not isinstance(sub, str):
        _raise_auth_required()
    try:
        user_id = UUID(sub)
    except ValueError:
        _raise_auth_required()

    return VerifiedSupabaseUser(user_id=user_id, jwt_payload=payload)
