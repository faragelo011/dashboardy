"""Supabase Admin boundary for provisioning users by email.

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
    async def provision_user(
        self,
        *,
        email: str,
        initial_password: str,
    ) -> InvitedUser: ...

    async def clear_must_reset_password(self, *, user_id: UUID) -> None: ...


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

    def __init__(
        self,
        *,
        supabase_url: str,
        service_role_key: str,
    ) -> None:
        self._base = supabase_url.rstrip("/")
        self._service_role_key = service_role_key

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._service_role_key}",
            "apikey": self._service_role_key,
            "Content-Type": "application/json",
        }

    async def provision_user(self, *, email: str, initial_password: str) -> InvitedUser:
        trimmed_email = email.strip()
        if not trimmed_email:
            raise ValueError("email must be non-empty")
        if not initial_password or len(initial_password) < 8:
            raise ValueError("initial_password must be at least 8 characters")

        # Supabase GoTrue admin API:
        # - Create: POST /auth/v1/admin/users
        # - Update: PUT /auth/v1/admin/users/{user_id}
        #
        # We try create first. If it already exists, we look it up by email and update.
        url = f"{self._base}/auth/v1/admin/users"
        headers = self._headers()
        payload = {
            "email": trimmed_email,
            "password": initial_password,
            "email_confirm": True,
            "app_metadata": {"must_reset_password": True},
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.post(url, headers=headers, json=payload)
        except (httpx.TimeoutException, httpx.RequestError) as exc:
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase invite request failed",
            ) from exc

        try:
            if res.status_code in (400, 422):
                # Likely already exists or payload rejected.
                # Try to locate by email and update.
                user_id = await self._lookup_user_id_by_email(
                    trimmed_email,
                    headers=headers,
                )
                await self._update_user(
                    user_id=user_id,
                    password=initial_password,
                    app_metadata={"must_reset_password": True},
                    headers=headers,
                )
                return InvitedUser(user_id=user_id, email=trimmed_email)

            res.raise_for_status()
        except HTTPStatusError as exc:
            status_code = res.status_code
            retry_after = res.headers.get("retry-after")
            if status_code == 429:
                msg = "Supabase admin request rate limited"
                if retry_after:
                    if retry_after.isdigit():
                        msg = f"{msg} (retry-after={retry_after}s)"
                    else:
                        msg = f"{msg} (retry-after={retry_after})"
                raise SupabaseAdminError(
                    status_code=429, error_code="rate_limited", message=msg
                ) from exc
            if status_code in (400, 422):
                logger.debug(
                    "Supabase admin request rejected (status=%s): response omitted",
                    status_code,
                )
                raise SupabaseAdminError(
                    status_code=400,
                    error_code="invite_rejected",
                    message="Supabase admin request rejected",
                ) from exc
            if status_code in (401, 403):
                logger.debug(
                    "Supabase admin request unauthorized (status=%s): response omitted",
                    status_code,
                )
                raise SupabaseAdminError(
                    status_code=503,
                    error_code="dependency_unavailable",
                    message="Supabase admin request unauthorized",
                ) from exc
            logger.debug(
                "Supabase admin request failed (status=%s): response body omitted",
                status_code,
            )
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase admin request failed",
            ) from exc
        try:
            data = res.json()
        except ValueError as exc:
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase admin request returned invalid JSON",
            ) from exc

        if not isinstance(data, dict):
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase admin request returned non-object JSON",
            )

        user = data.get("user")
        user_id_from_nested = user.get("id") if isinstance(user, dict) else None
        raw_id = data.get("id") or user_id_from_nested
        if not isinstance(raw_id, str):
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase admin response missing user id",
            )
        try:
            user_id = UUID(raw_id)
        except ValueError as exc:
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase admin response has invalid user id",
            ) from exc
        return InvitedUser(user_id=user_id, email=trimmed_email)

    async def clear_must_reset_password(self, *, user_id: UUID) -> None:
        headers = self._headers()
        await self._update_user(
            user_id=user_id,
            password=None,
            app_metadata={"must_reset_password": False},
            headers=headers,
        )

    async def _lookup_user_id_by_email(
        self,
        email: str,
        *,
        headers: dict[str, str],
    ) -> UUID:
        url = f"{self._base}/auth/v1/admin/users"
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.get(url, headers=headers, params={"email": email})
        except (httpx.TimeoutException, httpx.RequestError) as exc:
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase admin lookup request failed",
            ) from exc

        try:
            res.raise_for_status()
        except HTTPStatusError as exc:
            if res.status_code == 429:
                raise SupabaseAdminError(
                    status_code=429,
                    error_code="rate_limited",
                    message="Supabase admin lookup rate limited",
                ) from exc
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase admin lookup failed",
            ) from exc

        try:
            data = res.json()
        except ValueError as exc:
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase admin lookup returned invalid JSON",
            ) from exc

        # Different GoTrue builds return either { users: [...] } or [...].
        users: object = data
        if isinstance(data, dict) and "users" in data:
            users = data.get("users")
        if not isinstance(users, list) or not users:
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase admin lookup returned no users",
            )
        first = users[0]
        if not isinstance(first, dict):
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase admin lookup returned invalid user shape",
            )
        raw_id = first.get("id")
        if not isinstance(raw_id, str):
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase admin lookup user missing id",
            )
        try:
            return UUID(raw_id)
        except ValueError as exc:
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase admin lookup user id invalid",
            ) from exc

    async def _update_user(
        self,
        *,
        user_id: UUID,
        password: str | None,
        app_metadata: dict[str, object] | None,
        headers: dict[str, str],
    ) -> None:
        url = f"{self._base}/auth/v1/admin/users/{user_id}"
        payload: dict[str, object] = {}
        if password is not None:
            payload["password"] = password
        if app_metadata is not None:
            payload["app_metadata"] = app_metadata
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.put(url, headers=headers, json=payload)
        except (httpx.TimeoutException, httpx.RequestError) as exc:
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase admin update request failed",
            ) from exc

        try:
            res.raise_for_status()
        except HTTPStatusError as exc:
            if res.status_code == 429:
                raise SupabaseAdminError(
                    status_code=429,
                    error_code="rate_limited",
                    message="Supabase admin update rate limited",
                ) from exc
            if res.status_code in (400, 422):
                raise SupabaseAdminError(
                    status_code=400,
                    error_code="invite_rejected",
                    message="Supabase admin update rejected",
                ) from exc
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="Supabase admin update failed",
            ) from exc


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
    return HttpSupabaseAdmin(
        supabase_url=supabase_url,
        service_role_key=service_key,
    )

