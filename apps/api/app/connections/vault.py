"""Supabase Vault HTTP boundary (credential material never logged here)."""

from __future__ import annotations

import json
import uuid
from typing import Protocol, runtime_checkable

import httpx

from app.connections.errors import DependencyUnavailableError


async def _post_rpc_with_optional_legacy_fallback(
    *,
    url: str,
    headers: dict[str, str],
    rpc_bodies: list[dict[str, object]],
    timeout: float,
    transport: httpx.AsyncBaseTransport | None,
) -> httpx.Response:
    """POST JSON-RPC bodies; retry the next shape only if PostgREST returns 404.

    A 400 from the primary (jsonb `payload`) call means the RPC matched and the DB
    rejected the work — retrying legacy flat ``p_*`` args then yields a misleading
    404 and hides the real error.
    """
    resp: httpx.Response | None = None
    async with httpx.AsyncClient(timeout=timeout, transport=transport) as client:
        for i, body in enumerate(rpc_bodies):
            resp = await client.post(url, headers=headers, json=body)
            if resp.status_code < 400:
                break
            if resp.status_code == 404 and i + 1 < len(rpc_bodies):
                continue
            break
    assert resp is not None
    return resp


def _pgrst_error_suffix(resp: httpx.Response) -> str:
    """Short, non-sensitive detail from PostgREST JSON errors (debugging)."""
    try:
        data = resp.json()
    except ValueError:
        return ""
    if not isinstance(data, dict):
        return ""
    parts: list[str] = []
    for key in ("code", "message", "hint", "details"):
        val = data.get(key)
        if isinstance(val, str) and val.strip():
            parts.append(val.strip()[:400])
    if not parts:
        return ""
    return " (" + "; ".join(parts) + ")"


@runtime_checkable
class VaultClient(Protocol):
    async def store_secret(self, *, name: str, secret_payload: dict[str, str]) -> str:
        """Persist secret material in Vault and return an opaque reference."""

    async def read_secret(self, *, secret_id: str) -> dict[str, str]:
        """Fetch secret material from Vault by opaque id."""


class HttpSupabaseVaultClient:
    """HTTP client shell for Supabase-backed Vault operations.

    Calls `public.dashboardy_vault_*` wrappers with a jsonb `{ "payload": ... }`
    body first (Alembic 0009 / `scripts/supabase_vault_rpc_wrappers.sql`). If
    PostgREST returns **404** (older DBs still on 0008's `text,text,text` / `uuid`
    signatures), retries with flat `p_*` keys. A **400** is never retried: the
    jsonb RPC was found and failed inside PostgreSQL.
    """

    def __init__(
        self,
        *,
        base_url: str,
        service_role_key: str,
        timeout_seconds: float = 30.0,
        store_secret_path: str = "/rest/v1/rpc/dashboardy_vault_create_secret",
        read_secret_path: str = "/rest/v1/rpc/dashboardy_vault_read_secret_text",
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._service_role_key = service_role_key
        self._timeout = timeout_seconds
        trimmed = store_secret_path.strip().strip("/")
        self._store_secret_path = (
            f"/{trimmed}" if trimmed else "/rest/v1/rpc/dashboardy_vault_create_secret"
        )
        read_trimmed = read_secret_path.strip().strip("/")
        self._read_secret_path = (
            f"/{read_trimmed}"
            if read_trimmed
            else "/rest/v1/rpc/dashboardy_vault_read_secret_text"
        )
        self._transport = transport

    def _service_headers(self) -> dict[str, str]:
        token = self._service_role_key
        return {
            "apikey": token,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    async def store_secret(self, *, name: str, secret_payload: dict[str, str]) -> str:
        url = f"{self._base_url}{self._store_secret_path}"
        secret_json = json.dumps(secret_payload, separators=(",", ":"))
        inner = {"p_secret": secret_json, "p_name": name}
        # Primary: jsonb `payload` (0009). Legacy fallback on 404 only (0006–0008).
        rpc_bodies: list[dict[str, object]] = [
            {"payload": inner},
            {"p_secret": secret_json, "p_name": name},
        ]
        try:
            resp = await _post_rpc_with_optional_legacy_fallback(
                url=url,
                headers=self._service_headers(),
                rpc_bodies=rpc_bodies,
                timeout=self._timeout,
                transport=self._transport,
            )
        except httpx.HTTPError as exc:
            raise DependencyUnavailableError("Supabase dependency unavailable") from exc

        if resp.status_code >= 400:
            raise DependencyUnavailableError(
                "Supabase Vault rejected secret storage" + _pgrst_error_suffix(resp)
            )

        secret_id = _extract_secret_id(resp)
        if not secret_id:
            raise DependencyUnavailableError(
                "Supabase Vault did not return a secret id"
            )
        return secret_id

    async def read_secret(self, *, secret_id: str) -> dict[str, str]:
        url = f"{self._base_url}{self._read_secret_path}"
        rpc_bodies: list[dict[str, object]] = [
            {"payload": {"p_secret_id": secret_id}},
            {"p_secret_id": secret_id},
        ]
        try:
            resp = await _post_rpc_with_optional_legacy_fallback(
                url=url,
                headers=self._service_headers(),
                rpc_bodies=rpc_bodies,
                timeout=self._timeout,
                transport=self._transport,
            )
        except httpx.HTTPError as exc:
            raise DependencyUnavailableError("Supabase dependency unavailable") from exc

        if resp.status_code >= 400:
            raise DependencyUnavailableError(
                "Supabase Vault rejected secret read" + _pgrst_error_suffix(resp)
            )

        try:
            data = resp.json()
        except ValueError as exc:
            raise DependencyUnavailableError(
                "Supabase Vault returned invalid json"
            ) from exc

        if data is None:
            raise DependencyUnavailableError("Supabase Vault did not return a secret")
        if isinstance(data, dict) and len(data) == 1:
            only = next(iter(data.values()))
            if isinstance(only, str):
                data = only
        if not isinstance(data, str):
            raise DependencyUnavailableError(
                "Supabase Vault did not return a decrypted secret string"
            )
        decrypted = data
        if not decrypted.strip():
            raise DependencyUnavailableError(
                "Supabase Vault did not return decrypted_secret"
            )
        try:
            parsed = json.loads(decrypted)
        except json.JSONDecodeError as exc:
            raise DependencyUnavailableError(
                "Supabase Vault secret payload was not JSON"
            ) from exc
        if not isinstance(parsed, dict):
            raise DependencyUnavailableError(
                "Supabase Vault secret payload was not an object"
            )
        return {str(k): str(v) for k, v in parsed.items()}


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
