"""Supabase JWT verification using JWKS (cache-safe via PyJWKClient)."""

from __future__ import annotations

import logging
from functools import lru_cache
from uuid import UUID

import jwt
from jwt import PyJWKClient

from app.auth_context.context import InvalidJwtError
from app.config import get_settings

logger = logging.getLogger(__name__)
_audience_verification_warned = False


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    return PyJWKClient(get_settings().SUPABASE_JWKS_URL)


def reset_jwks_client_cache() -> None:
    """Clear cached JWKS client (used by tests)."""

    _jwks_client.cache_clear()


def verify_supabase_jwt(token: str) -> UUID:
    """Verify a Supabase JWT and return the authenticated user id (`sub` claim)."""

    settings = get_settings()
    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(token)
    except Exception as exc:  # noqa: BLE001 - map all JWKS fetch/parse errors
        raise InvalidJwtError("Unable to resolve signing key for JWT") from exc

    decode_kwargs: dict = {
        "algorithms": ["RS256"],
        "issuer": settings.SUPABASE_JWT_ISSUER,
    }
    if settings.SUPABASE_JWT_AUDIENCE:
        decode_kwargs["audience"] = settings.SUPABASE_JWT_AUDIENCE
    else:
        decode_kwargs["options"] = {"verify_aud": False}
        global _audience_verification_warned
        if not _audience_verification_warned:
            _audience_verification_warned = True
            logger.warning(
                "SUPABASE_JWT_AUDIENCE is unset; JWT audience verification is disabled "
                "(verify_aud=False). Set SUPABASE_JWT_AUDIENCE in production."
            )

    try:
        payload = jwt.decode(token, signing_key.key, **decode_kwargs)
    except jwt.ExpiredSignatureError as exc:
        raise InvalidJwtError("JWT has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise InvalidJwtError("JWT is invalid") from exc

    sub = payload.get("sub")
    if not isinstance(sub, str):
        raise InvalidJwtError("JWT is missing string `sub` claim")

    try:
        return UUID(sub)
    except ValueError as exc:
        raise InvalidJwtError("JWT `sub` is not a UUID") from exc
