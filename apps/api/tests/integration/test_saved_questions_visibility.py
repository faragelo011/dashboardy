"""Integration tests for permission-filtered saved-question visibility (US2)."""

from __future__ import annotations

import asyncio

import pytest
from app.main import app
from fastapi.testclient import TestClient

from tests.saved_questions_fixtures import seed_question_catalog


def test_admin_analyst_viewer_and_external_client_visibility(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    headers = {"Authorization": "Bearer fake"}

    cases = [
        (seeded.admin_user_id, "admin@example.com", True, True),
        (seeded.analyst_user_id, "analyst@example.com", True, True),
        (seeded.viewer_user_id, "viewer@example.com", True, True),
        (seeded.external_user_id, "client@example.com", True, False),
    ]

    for user_id, email, expect_question, expect_collection in cases:
        from app.db.session import get_async_session_maker, get_engine

        get_engine.cache_clear()
        get_async_session_maker.cache_clear()
        monkeypatch.setattr(
            "app.auth_context.dependencies.decode_supabase_jwt",
            lambda _t, uid=user_id, em=email: {"sub": str(uid), "email": em},
        )
        with TestClient(app) as client:
            questions = client.get(
                f"/workspaces/{seeded.workspace_id}/questions",
                headers=headers,
            )
            assert questions.status_code == 200
            ids = {q["id"] for q in questions.json()["questions"]}
            if expect_question:
                assert str(seeded.question_id) in ids
            else:
                assert str(seeded.question_id) not in ids

            collections = client.get(
                f"/workspaces/{seeded.workspace_id}/collections",
                headers=headers,
            )
            assert collections.status_code == 200
            collection_ids = {c["id"] for c in collections.json()["collections"]}
            if expect_collection:
                assert str(seeded.collection_id) in collection_ids
            else:
                assert str(seeded.collection_id) not in collection_ids


def test_viewer_without_grant_sees_nothing(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(
        seed_question_catalog(
            grant_viewer_collection_access=False,
            grant_external_asset=False,
        )
    )
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.viewer_user_id), "email": "viewer@example.com"},
    )
    with TestClient(app) as client:
        questions = client.get(
            f"/workspaces/{seeded.workspace_id}/questions",
            headers={"Authorization": "Bearer fake"},
        )
    assert questions.status_code == 200
    assert questions.json()["questions"] == []
