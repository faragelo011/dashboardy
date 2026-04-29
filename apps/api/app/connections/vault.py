"""Supabase Vault HTTP boundary (credential material never logged here)."""

from __future__ import annotations

import uuid
from typing import Protocol, runtime_checkable

import httpx

from app.connections.errors import DependencyUnavailableError


@runtime_checkable
class VaultClient(Protocol):
    async def store_secret(self, *, name: str, secret_payload: dict[str, str]) -> str:
        """Persist secret material in Vault and return an opaque reference."""


class HttpSupabaseVaultClient:
    """HTTP client shell for Supabase-backed Vault operations.

    User story tasks wire the concrete Vault API path and payload shape. This
    class owns outbound HTTP configuration so tests can substitute fakes.
    """

    def __init__(
        self,
        *,
        base_url: str,
        service_role_key: str,
        timeout_seconds: float = 30.0,
        store_secret_path: str = "/rest/v1/rpc/vault_create_secret",
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._service_role_key = service_role_key
        self._timeout = timeout_seconds
        trimmed = store_secret_path.strip().strip("/")
        self._store_secret_path = (
            f"/{trimmed}" if trimmed else "/rest/v1/rpc/vault_create_secret"
        )
        self._transport = transport

    async def store_secret(self, *, name: str, secret_payload: dict[str, str]) -> str:
        token = self._service_role_key
        headers = {
            "apikey": token,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        url = f"{self._base_url}{self._store_secret_path}"
        payload = {"name": name, "secret": secret_payload}
        try:
            async with httpx.AsyncClient(
                timeout=self._timeout,
                transport=self._transport,
            ) as client:
                resp = await client.post(url, headers=headers, json=payload)
        except httpx.HTTPError as exc:
            raise DependencyUnavailableError("Supabase dependency unavailable") from exc
        if resp.status_code >= 400:
            raise DependencyUnavailableError("Supabase Vault rejected secret storage")

        secret_id = _extract_secret_id(resp)
        if not secret_id:
            raise DependencyUnavailableError(
                "Supabase Vault did not return a secret id"
            )
        return secret_id


def _extract_secret_id(resp: httpx.Response) -> str | None:
    try:
        data = resp.json()
    except ValueError:
        return None

    if isinstance(data, str) and data:
        return data
    if isinstance(data, list) and data:
        first = data[0]
        if isinstance(first, str) and first:
            return first
        if isinstance(first, dict):
            return _extract_secret_id_from_mapping(first)
    if isinstance(data, dict):
        return _extract_secret_id_from_mapping(data)
    return None


def _extract_secret_id_from_mapping(data: dict[str, object]) -> str | None:
    for key in ("id", "secret_id", "vault_secret_id"):
        value = data.get(key)
        if isinstance(value, uuid.UUID):
            return str(value)
        if isinstance(value, str) and value:
            return value
    return None
