"""Integration tests for saved-question authoring lifecycle (US1)."""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.main import app
from app.models.auth_tenancy import MembershipRole
from app.models.saved_questions import SavedQuestion
from fastapi.testclient import TestClient
from sqlalchemy import select

from tests.saved_questions_fixtures import seed_workspace_with_author


def test_author_collection_and_question_lifecycle(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_workspace_with_author(actor_role=MembershipRole.analyst))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.actor_user_id), "email": "analyst@example.com"},
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        collection = client.post(
            f"/workspaces/{seeded.workspace_id}/collections",
            json={"name": "Revenue"},
            headers=headers,
        )
        assert collection.status_code == 201
        collection_id = collection.json()["id"]

        question = client.post(
            f"/workspaces/{seeded.workspace_id}/questions",
            json={
                "collection_id": collection_id,
                "title": "ARR",
                "sql_text": "SELECT amount FROM revenue",
                "parameters": [],
            },
            headers=headers,
        )
        assert question.status_code == 201
        question_id = question.json()["id"]

        listed = client.get(
            f"/workspaces/{seeded.workspace_id}/questions",
            params={"collection_id": collection_id},
            headers=headers,
        )
        assert listed.status_code == 200
        assert {q["id"] for q in listed.json()["questions"]} == {question_id}

        detail = client.get(
            f"/workspaces/{seeded.workspace_id}/questions/{question_id}",
            headers=headers,
        )
        assert detail.status_code == 200
        assert detail.json()["sql_text"] == "SELECT amount FROM revenue"

        updated = client.patch(
            f"/workspaces/{seeded.workspace_id}/questions/{question_id}",
            json={
                "expected_updated_at": detail.json()["updated_at"],
                "title": "ARR updated",
            },
            headers=headers,
        )
        assert updated.status_code == 200
        assert updated.json()["title"] == "ARR updated"

        deleted = client.delete(
            f"/workspaces/{seeded.workspace_id}/questions/{question_id}",
            headers=headers,
        )
        assert deleted.status_code == 204

        after_delete_list = client.get(
            f"/workspaces/{seeded.workspace_id}/questions",
            params={"collection_id": collection_id},
            headers=headers,
        )
        assert after_delete_list.json()["questions"] == []

        gone = client.get(
            f"/workspaces/{seeded.workspace_id}/questions/{question_id}",
            headers=headers,
        )
        assert gone.status_code == 404

    async def _row_still_exists() -> bool:
        from app.db.session import get_async_session_maker

        maker = get_async_session_maker()
        async with maker() as session:
            stmt = select(SavedQuestion).where(
                SavedQuestion.id == uuid.UUID(question_id)
            )
            row = (await session.execute(stmt)).scalar_one_or_none()
            return row is not None and row.deleted_at is not None

    assert asyncio.run(_row_still_exists())

    with TestClient(app) as client:
        collection_deleted = client.delete(
            f"/workspaces/{seeded.workspace_id}/collections/{collection_id}",
            headers=headers,
        )
        assert collection_deleted.status_code == 204

        collections = client.get(
            f"/workspaces/{seeded.workspace_id}/collections",
            headers=headers,
        )
        assert collections.json()["collections"] == []
