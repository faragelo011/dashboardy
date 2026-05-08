from __future__ import annotations

import json

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
        body = await request.aread()
        seen["payload"] = json.loads(body.decode())
        assert request.headers["apikey"] == "service-key"
        assert request.headers["Authorization"] == "Bearer service-key"
        assert "Accept-Profile" not in request.headers
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
    assert (
        seen["url"]
        == "https://example.supabase.co/rest/v1/rpc/dashboardy_vault_create_secret"
    )
    assert seen["payload"] == {
        "payload": {
            "p_name": "tenant-connection",
            "p_secret": json.dumps({"password": "super-secret"}, separators=(",", ":")),
        },
    }


@pytest.mark.asyncio
async def test_read_secret_posts_secret_id_and_parses_json_string() -> None:
    seen: dict[str, object] = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        seen["method"] = request.method
        seen["url"] = str(request.url)
        body = await request.aread()
        seen["payload"] = json.loads(body.decode())
        inner = json.dumps({"password": "x"}, separators=(",", ":"))
        return httpx.Response(200, text=json.dumps(inner))

    client = HttpSupabaseVaultClient(
        base_url="https://example.supabase.co",
        service_role_key="service-key",
        transport=httpx.MockTransport(handler),
    )

    out = await client.read_secret(secret_id="00000000-0000-0000-0000-000000000001")
    assert out == {"password": "x"}
    assert seen["method"] == "POST"
    assert (
        seen["url"]
        == "https://example.supabase.co/rest/v1/rpc/dashboardy_vault_read_secret_text"
    )
    assert seen["payload"] == {
        "payload": {
            "p_secret_id": "00000000-0000-0000-0000-000000000001",
        },
    }


@pytest.mark.asyncio
async def test_store_secret_falls_back_to_flat_args_when_payload_returns_404() -> None:
    calls: list[dict[str, object]] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads((await request.aread()).decode())
        calls.append(body)
        if len(calls) == 1:
            return httpx.Response(404, json={"message": "PGRST202"})
        return httpx.Response(200, json={"id": "vault-after-fallback"})

    client = HttpSupabaseVaultClient(
        base_url="https://example.supabase.co",
        service_role_key="service-key",
        transport=httpx.MockTransport(handler),
    )

    secret_id = await client.store_secret(
        name="n",
        secret_payload={"password": "p"},
    )
    secret_json = json.dumps({"password": "p"}, separators=(",", ":"))
    assert secret_id == "vault-after-fallback"
    assert calls[0] == {
        "payload": {"p_name": "n", "p_secret": secret_json},
    }
    assert calls[1] == {"p_secret": secret_json, "p_name": "n"}


@pytest.mark.asyncio
async def test_store_secret_does_not_fallback_when_payload_returns_400() -> None:
    calls: list[dict[str, object]] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads((await request.aread()).decode())
        calls.append(body)
        return httpx.Response(
            400,
            json={"message": "null value in column", "code": "23502"},
        )

    client = HttpSupabaseVaultClient(
        base_url="https://example.supabase.co",
        service_role_key="service-key",
        transport=httpx.MockTransport(handler),
    )

    with pytest.raises(DependencyUnavailableError) as excinfo:
        await client.store_secret(name="n", secret_payload={"password": "p"})
    assert "23502" in str(excinfo.value) or "null value" in str(excinfo.value)
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_read_secret_falls_back_to_flat_arg_on_404() -> None:
    calls: list[dict[str, object]] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads((await request.aread()).decode())
        calls.append(body)
        if len(calls) == 1:
            return httpx.Response(404, json={"message": "PGRST202"})
        inner = json.dumps({"password": "x"}, separators=(",", ":"))
        return httpx.Response(200, text=json.dumps(inner))

    client = HttpSupabaseVaultClient(
        base_url="https://example.supabase.co",
        service_role_key="service-key",
        transport=httpx.MockTransport(handler),
    )

    out = await client.read_secret(secret_id="00000000-0000-0000-0000-000000000001")
    assert out == {"password": "x"}
    assert calls[0] == {
        "payload": {"p_secret_id": "00000000-0000-0000-0000-000000000001"},
    }
    assert calls[1] == {"p_secret_id": "00000000-0000-0000-0000-000000000001"}


@pytest.mark.asyncio
async def test_read_secret_does_not_fallback_when_payload_returns_400() -> None:
    calls: list[dict[str, object]] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads((await request.aread()).decode())
        calls.append(body)
        return httpx.Response(400, json={"message": "permission denied"})

    client = HttpSupabaseVaultClient(
        base_url="https://example.supabase.co",
        service_role_key="service-key",
        transport=httpx.MockTransport(handler),
    )

    with pytest.raises(DependencyUnavailableError) as excinfo:
        await client.read_secret(secret_id="00000000-0000-0000-0000-000000000001")
    assert "permission denied" in str(excinfo.value).lower()
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_store_secret_normalizes_path_without_leading_slash() -> None:
    seen: dict[str, object] = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        return httpx.Response(200, json={"id": "x"})

    client = HttpSupabaseVaultClient(
        base_url="https://example.supabase.co",
        service_role_key="k",
        store_secret_path="rest/v1/rpc/dashboardy_vault_create_secret",
        transport=httpx.MockTransport(handler),
    )
    await client.store_secret(name="n", secret_payload={"password": "p"})
    assert (
        seen["url"]
        == "https://example.supabase.co/rest/v1/rpc/dashboardy_vault_create_secret"
    )


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
