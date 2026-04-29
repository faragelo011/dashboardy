from __future__ import annotations

from typing import Any

import pytest
from app.admin.supabase_admin import get_supabase_admin


class _FakeResponse:
    def __init__(self, *, captured_json: dict[str, Any]) -> None:
        self.status_code = 200
        self.headers: dict[str, str] = {}
        self.text = ""
        self._json = captured_json

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, Any]:
        return {"id": "00000000-0000-4000-8000-000000000001"}


class _FakeAsyncClient:
    def __init__(self, *, timeout: int) -> None:
        self.timeout = timeout
        self.captured: dict[str, Any] | None = None

    async def __aenter__(self) -> _FakeAsyncClient:
        return self

    async def __aexit__(self, _exc_type, _exc, _tb) -> None:
        return None

    async def post(self, url: str, *, headers: dict[str, str], json: dict[str, Any]):
        self.captured = {"url": url, "headers": headers, "json": json}
        return _FakeResponse(captured_json=json)


@pytest.mark.asyncio
async def test_invite_includes_redirect_to(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key")
    monkeypatch.setenv("WEB_PUBLIC_URL", "http://localhost:3000")

    fake_client = _FakeAsyncClient(timeout=10)
    monkeypatch.setattr(
        "app.admin.supabase_admin.httpx.AsyncClient",
        lambda timeout: fake_client,
    )

    admin = get_supabase_admin()
    await admin.invite_user(email="invitee@example.com")

    assert fake_client.captured is not None
    payload = fake_client.captured["json"]
    assert payload["email"] == "invitee@example.com"
    assert payload["redirect_to"] == "http://localhost:3000/auth/callback?next=/set-password"

