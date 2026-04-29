"""Supabase Admin boundary for inviting users by email.

This module intentionally provides a thin interface so tests can substitute a
fake implementation without any network calls.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

import httpx
from httpx import HTTPStatusError

from app.config import get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class InvitedUser:
    user_id: UUID
    email: str


class SupabaseAdmin(Protocol):
    async def invite_user(self, *, email: str) -> InvitedUser: ...


class SupabaseAdminError(RuntimeError):
    """Error raised when the Supabase Admin API call fails.

    Carries an HTTP status code so the API layer can map it correctly.
    """

    def __init__(self, *, status_code: int, error_code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code
        self.message = message


class HttpSupabaseAdmin:
    """Default Supabase Admin implementation using service-role credentials."""

    def __init__(self, *, supabase_url: str, service_role_key: str) -> None:
        self._base = supabase_url.rstrip("/")
        self._service_role_key = service_role_key

    async def invite_user(self, *, email: str) -> InvitedUser:
        trimmed_email = email.strip()
        if not trimmed_email:
            raise ValueError("email must be non-empty")

        url = f"{self._base}/auth/v1/invite"
        headers = {
            "Authorization": f"Bearer {self._service_role_key}",
            "apikey": self._service_role_key,
            "Content-Type": "application/json",
        }
        payload = {"email": trimmed_email}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.post(url, headers=headers, json=payload)
        except (httpx.TimeoutException, httpx.RequestError) as exc:
            raise RuntimeError("Supabase invite request failed") from exc

        try:
            res.raise_for_status()
        except HTTPStatusError as exc:
            body_text = res.text
            status_code = res.status_code
            retry_after = res.headers.get("retry-after")
            if status_code == 429:
                msg = "Supabase invite rate limited"
                if retry_after:
                    msg = f"{msg} (retry-after={retry_after}s)"
                raise SupabaseAdminError(
                    status_code=429, error_code="rate_limited", message=msg
                ) from exc
            if status_code in (400, 422):
                logger.debug(
                    "Supabase invite rejected (status=%s): %s", status_code, body_text
                )
                raise SupabaseAdminError(
                    status_code=400,
                    error_code="invite_rejected",
                    message="Supabase invite rejected",
                ) from exc
            if status_code in (401, 403):
                logger.debug(
                    "Supabase invite unauthorized (status=%s): %s",
                    status_code,
                    body_text,
                )
                raise SupabaseAdminError(
                    status_code=503,
                    error_code="dependency_unavailable",
                    message="Supabase invite unauthorized",
                ) from exc
            logger.debug(
                "Supabase invite failed (status=%s): %s", status_code, body_text
            )
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase invite failed",
            ) from exc
        try:
            data = res.json()
        except ValueError as exc:
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase invite returned invalid JSON",
            ) from exc

        if not isinstance(data, dict):
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase invite returned non-object JSON",
            )

        user = data.get("user")
        user_id_from_nested = user.get("id") if isinstance(user, dict) else None
        raw_id = data.get("id") or user_id_from_nested
        if not isinstance(raw_id, str):
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase invite response missing user id",
            )
        try:
            user_id = UUID(raw_id)
        except ValueError as exc:
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase invite response has invalid user id",
            ) from exc
        return InvitedUser(user_id=user_id, email=trimmed_email)


def get_supabase_admin() -> SupabaseAdmin:
    """FastAPI dependency that returns a SupabaseAdmin client.

    Tests should override this dependency to avoid outbound HTTP calls.
    """

    settings = get_settings()
    supabase_url = getattr(settings, "SUPABASE_URL", None)  # may be absent
    service_key = getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", None)
    if not supabase_url or not service_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to invite members"
        )
    return HttpSupabaseAdmin(supabase_url=supabase_url, service_role_key=service_key)

