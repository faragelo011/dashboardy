"""Supabase JWT verification using JWKS (cache-safe via PyJWKClient)."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any
from uuid import UUID

import jwt
from jwt import PyJWKClient

from app.auth_context.context import InvalidJwtError
from app.config import get_settings

logger = logging.getLogger(__name__)
_audience_verification_warned = False


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    settings = get_settings()
    if not settings.SUPABASE_JWKS_URL or not settings.SUPABASE_JWKS_URL.strip():
        raise InvalidJwtError(
            "SUPABASE_JWKS_URL is not set (required for RS256 tokens)"
        )
    return PyJWKClient(settings.SUPABASE_JWKS_URL)


def reset_jwks_client_cache() -> None:
    """Clear cached JWKS client (used by tests)."""

    _jwks_client.cache_clear()


def decode_supabase_jwt(token: str) -> dict[str, Any]:
    """Verify JWT signature and standard claims; return the decoded payload.

    Supports:
    - RS256 via SUPABASE_JWKS_URL (JWKS)
    - HS256 via SUPABASE_JWT_SECRET (Supabase Project Settings → API → JWT Secret)
    """

    settings = get_settings()
    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as exc:
        raise InvalidJwtError("JWT is invalid") from exc

    alg = header.get("alg")
    if not isinstance(alg, str) or not alg:
        raise InvalidJwtError("JWT is missing `alg` header")

    alg_upper = alg.upper()
    if alg_upper == "HS256":
        secret = settings.SUPABASE_JWT_SECRET
        if not secret or not secret.strip():
            raise InvalidJwtError(
                "JWT uses HS256 but SUPABASE_JWT_SECRET is not set "
                "(Supabase Project Settings → API → JWT Secret)"
            )
        signing_key: Any = secret
        algorithms = ["HS256"]
    else:
        try:
            signing_key = _jwks_client().get_signing_key_from_jwt(token).key
        except Exception as exc:  # noqa: BLE001 - map all JWKS fetch/parse errors
            raise InvalidJwtError("Unable to resolve signing key for JWT") from exc
        # Supabase signing keys may use ES256 (common) or RS256.
        # We trust the token header `alg` but still verify the signature via JWKS.
        algorithms = [alg_upper]

    decode_kwargs: dict[str, Any] = {
        "algorithms": algorithms,
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
        return jwt.decode(token, signing_key, **decode_kwargs)
    except jwt.ExpiredSignatureError as exc:
        raise InvalidJwtError("JWT has expired") from exc
    except jwt.InvalidIssuerError as exc:
        raise InvalidJwtError(
            "JWT issuer is invalid (check SUPABASE_JWT_ISSUER)"
        ) from exc
    except jwt.InvalidAudienceError as exc:
        raise InvalidJwtError(
            "JWT audience is invalid (check SUPABASE_JWT_AUDIENCE or leave unset)"
        ) from exc
    except jwt.InvalidSignatureError as exc:
        raise InvalidJwtError(
            "JWT signature is invalid (wrong SUPABASE_JWT_SECRET or wrong "
            "SUPABASE_JWKS_URL)"
        ) from exc
    except jwt.InvalidAlgorithmError as exc:
        raise InvalidJwtError("JWT algorithm is invalid") from exc
    except jwt.DecodeError as exc:
        raise InvalidJwtError("JWT decode error") from exc
    except jwt.InvalidTokenError as exc:
        raise InvalidJwtError("JWT is invalid") from exc


def verify_supabase_jwt(token: str) -> UUID:
    """Verify a Supabase JWT and return the authenticated user id (`sub` claim)."""

    payload = decode_supabase_jwt(token)
    sub = payload.get("sub")
    if not isinstance(sub, str):
        raise InvalidJwtError("JWT is missing string `sub` claim")

    try:
        return UUID(sub)
    except ValueError as exc:
        raise InvalidJwtError("JWT `sub` is not a UUID") from exc
