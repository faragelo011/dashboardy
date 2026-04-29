from __future__ import annotations

import httpx
import pytest
from app.connections.errors import DependencyUnavailableError
from app.connections.vault import HttpSupabaseVaultClient


@pytest.mark.asyncio
async def test_store_secret_posts_payload_and_returns_secret_id() -> None:
    seen: dict[str, object] = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        seen["method"] = request.method
        seen["url"] = str(request.url)
        seen["payload"] = request.read()
        assert request.headers["apikey"] == "service-key"
        return httpx.Response(200, json={"id": "vault-id-123"})

    client = HttpSupabaseVaultClient(
        base_url="https://example.supabase.co",
        service_role_key="service-key",
        transport=httpx.MockTransport(handler),
    )

    secret_id = await client.store_secret(
        name="tenant-connection",
        secret_payload={"password": "super-secret"},
    )

    assert secret_id == "vault-id-123"
    assert seen["method"] == "POST"
    assert seen["url"] == "https://example.supabase.co/rest/v1/rpc/vault_create_secret"
    assert b"tenant-connection" in seen["payload"]
    assert b"super-secret" in seen["payload"]


@pytest.mark.asyncio
async def test_store_secret_fails_when_vault_returns_no_id() -> None:
    async def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"ok": True})

    client = HttpSupabaseVaultClient(
        base_url="https://example.supabase.co",
        service_role_key="service-key",
        transport=httpx.MockTransport(handler),
    )

    with pytest.raises(DependencyUnavailableError):
        await client.store_secret(
            name="tenant-connection",
            secret_payload={"password": "super-secret"},
        )
