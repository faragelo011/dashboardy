"""Supabase Admin boundary for inviting users by email.

This module intentionally provides a thin interface so tests can substitute a
fake implementation without any network calls.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

import httpx

from app.config import get_settings


@dataclass(frozen=True, slots=True)
class InvitedUser:
    user_id: UUID
    email: str


class SupabaseAdmin(Protocol):
    async def invite_user(self, *, email: str) -> InvitedUser: ...


class HttpSupabaseAdmin:
    """Default Supabase Admin implementation using service-role credentials."""

    def __init__(self, *, supabase_url: str, service_role_key: str) -> None:
        self._base = supabase_url.rstrip("/")
        self._service_role_key = service_role_key

    async def invite_user(self, *, email: str) -> InvitedUser:
        if not email.strip():
            raise ValueError("email must be non-empty")

        url = f"{self._base}/auth/v1/invite"
        headers = {
            "Authorization": f"Bearer {self._service_role_key}",
            "apikey": self._service_role_key,
            "Content-Type": "application/json",
        }
        payload = {"email": email}
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(url, headers=headers, json=payload)
        res.raise_for_status()
        data = res.json()

        raw_id = data.get("id") or data.get("user", {}).get("id")
        if not isinstance(raw_id, str):
            raise RuntimeError("Supabase invite response missing user id")
        return InvitedUser(user_id=UUID(raw_id), email=email)


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

