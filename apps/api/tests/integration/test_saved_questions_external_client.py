"""External-client consumer detail tests for saved questions (US2)."""

from __future__ import annotations

import asyncio

import pytest
from app.main import app
from fastapi.testclient import TestClient

from tests.saved_questions_fixtures import seed_question_catalog


def test_external_client_detail_omits_sql_text(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.external_user_id), "email": "client@example.com"},
    )
    with TestClient(app) as client:
        detail = client.get(
            f"/workspaces/{seeded.workspace_id}/questions/{seeded.question_id}",
            headers={"Authorization": "Bearer fake"},
        )
    assert detail.status_code == 200
    body = detail.json()
    assert body["detail_level"] == "consumer"
    assert "sql_text" not in body
    assert body["permission"] == "view"
    assert body["title"] == "ARR"
