"""Authenticated user context primitives and token error types."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True, slots=True)
class AuthUserContext:
    """Authenticated Supabase user identity derived from a verified JWT."""

    user_id: UUID


class AuthTokenError(Exception):
    """Base class for authentication failures before tenancy resolution."""


class MissingBearerTokenError(AuthTokenError):
    """No `Authorization: Bearer` token was provided."""


class InvalidJwtError(AuthTokenError):
    """JWT is present but cannot be verified or parsed."""
