"""Contract checks for POST /auth/password-reset-complete."""

from __future__ import annotations

import pytest
from app.admin.supabase_admin import SupabaseAdminError
from app.main import app
from app.routes.auth import get_supabase_admin_provider
from fastapi.testclient import TestClient


class _FakeSupabaseAdmin:
    def __init__(self) -> None:
        self.cleared_for: list[str] = []

    async def provision_user(self, *, email: str, initial_password: str):
        raise AssertionError("provision_user not expected in this test")

    async def clear_must_reset_password(self, *, user_id):
        self.cleared_for.append(str(user_id))
        return None


def test_password_reset_complete_204(monkeypatch: pytest.MonkeyPatch):
    fake = _FakeSupabaseAdmin()
    app.dependency_overrides[
        get_supabase_admin_provider
    ] = lambda: lambda: fake
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {
            "sub": "00000000-0000-4000-8000-000000000010",
            "email": "x@example.com",
        },
    )
    try:
        with TestClient(app) as client:
            r = client.post(
                "/auth/password-reset-complete",
                headers={"Authorization": "Bearer fake"},
            )
        assert r.status_code == 204
        assert fake.cleared_for == ["00000000-0000-4000-8000-000000000010"]
    finally:
        app.dependency_overrides.pop(
            get_supabase_admin_provider,
            None,
        )


def test_password_reset_complete_503_on_supabase_error(monkeypatch: pytest.MonkeyPatch):
    class _BoomAdmin(_FakeSupabaseAdmin):
        async def clear_must_reset_password(self, *, user_id):
            raise SupabaseAdminError(
                status_code=503,
                error_code="dependency_unavailable",
                message="nope",
            )

    app.dependency_overrides[get_supabase_admin_provider] = lambda: lambda: _BoomAdmin()
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {
            "sub": "00000000-0000-4000-8000-000000000010",
            "email": "x@example.com",
        },
    )
    try:
        with TestClient(app) as client:
            r = client.post(
                "/auth/password-reset-complete",
                headers={"Authorization": "Bearer fake"},
            )
        assert r.status_code == 503
        assert r.json()["error_code"] == "dependency_unavailable"
    finally:
        app.dependency_overrides.pop(
            get_supabase_admin_provider,
            None,
        )

