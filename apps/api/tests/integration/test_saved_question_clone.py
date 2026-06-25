"""Integration tests for saved-question clone semantics (US3)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from app.questions import repository as questions_repository
from fastapi.testclient import TestClient

from tests.saved_questions_fixtures import seed_clone_scenario


def test_clone_copies_content_and_ownership(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_clone_scenario())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.cloner_user_id), "email": "cloner@example.com"},
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        cloned = client.post(
            f"/workspaces/{seeded.workspace_id}/questions/{seeded.source_question_id}/clone",
            json={"target_collection_id": str(seeded.target_collection_id)},
            headers=headers,
        )

    assert cloned.status_code == 201
    body = cloned.json()
    clone_id = body["id"]
    assert clone_id != str(seeded.source_question_id)
    assert body["collection_id"] == str(seeded.target_collection_id)
    assert body["title"] == "ARR"
    assert body["description"] == "Annual recurring revenue"
    assert body["sql_text"] == "SELECT %(region)s AS region, 1 AS amount"
    assert body["parameters"][0]["name"] == "region"
    assert body["parameters"][0]["type"] == "string"
    assert body["parameters"][0]["required"] is True

    async def _verify_db() -> None:
        from app.db.session import get_async_session_maker, get_engine

        get_engine.cache_clear()
        get_async_session_maker.cache_clear()

        maker = get_async_session_maker()
        async with maker() as session:
            source = await questions_repository.get_active_saved_question(
                session,
                tenant_id=seeded.tenant_id,
                workspace_id=seeded.workspace_id,
                question_id=seeded.source_question_id,
            )
            clone = await questions_repository.get_active_saved_question(
                session,
                tenant_id=seeded.tenant_id,
                workspace_id=seeded.workspace_id,
                question_id=uuid.UUID(clone_id),
            )
            assert source is not None
            assert clone is not None
            assert source.title == "ARR"
            assert source.sql_text == "SELECT %(region)s AS region, 1 AS amount"
            assert str(clone.created_by_membership_id) == str(
                seeded.cloner_membership_id
            )
            assert clone.collection_id == seeded.target_collection_id

            source_grants = (
                await questions_repository.list_question_grants_for_saved_question(
                    session,
                    tenant_id=seeded.tenant_id,
                    workspace_id=seeded.workspace_id,
                    saved_question_id=seeded.source_question_id,
                )
            )
            clone_grants = (
                await questions_repository.list_question_grants_for_saved_question(
                    session,
                    tenant_id=seeded.tenant_id,
                    workspace_id=seeded.workspace_id,
                    saved_question_id=clone.id,
                )
            )
            assert len(source_grants) == 1
            assert clone_grants == []

    asyncio.run(_verify_db())


def test_clone_inherits_target_collection_permissions(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_clone_scenario())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.cloner_user_id), "email": "cloner@example.com"},
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        cloned = client.post(
            f"/workspaces/{seeded.workspace_id}/questions/{seeded.source_question_id}/clone",
            json={"target_collection_id": str(seeded.target_collection_id)},
            headers=headers,
        )
        assert cloned.status_code == 201
        clone_id = cloned.json()["id"]

        monkeypatch.setattr(
            "app.auth_context.dependencies.decode_supabase_jwt",
            lambda _t: {
                "sub": str(seeded.target_viewer_user_id),
                "email": "target-viewer@example.com",
            },
        )
        detail = client.get(
            f"/workspaces/{seeded.workspace_id}/questions/{clone_id}",
            headers=headers,
        )

    assert detail.status_code == 200
    assert detail.json()["permission"] == "view"
    assert detail.json()["detail_level"] == "consumer"


def test_viewer_with_edit_grants_cannot_clone(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_clone_scenario())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {
            "sub": str(seeded.grant_editor_user_id),
            "email": "grant-editor@example.com",
        },
    )

    with TestClient(app) as client:
        cloned = client.post(
            f"/workspaces/{seeded.workspace_id}/questions/{seeded.source_question_id}/clone",
            json={"target_collection_id": str(seeded.target_collection_id)},
            headers={"Authorization": "Bearer fake"},
        )

    assert cloned.status_code == 403
    assert cloned.json()["error_code"] == "authz_denied"
