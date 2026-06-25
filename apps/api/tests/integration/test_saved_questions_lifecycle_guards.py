"""Integration tests for saved-question lifecycle guards (US1)."""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from app.main import app
from app.models.auth_tenancy import MembershipRole
from app.models.query_engine import CacheEntry
from app.query_engine.enums import PresentationClass
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from tests.saved_questions_fixtures import seed_workspace_with_author


def _headers(monkeypatch: pytest.MonkeyPatch, seeded) -> dict[str, str]:
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.actor_user_id), "email": "analyst@example.com"},
    )
    return {"Authorization": "Bearer fake"}


def test_duplicate_collection_name_rejected(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_workspace_with_author(actor_role=MembershipRole.analyst))
    headers = _headers(monkeypatch, seeded)

    with TestClient(app) as client:
        first = client.post(
            f"/workspaces/{seeded.workspace_id}/collections",
            json={"name": "Revenue"},
            headers=headers,
        )
        assert first.status_code == 201
        dup = client.post(
            f"/workspaces/{seeded.workspace_id}/collections",
            json={"name": "  Revenue  "},
            headers=headers,
        )
    assert dup.status_code == 409
    assert dup.json()["error_code"] == "duplicate_collection_name"


def test_non_empty_collection_delete_refused(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_workspace_with_author(actor_role=MembershipRole.analyst))
    headers = _headers(monkeypatch, seeded)

    with TestClient(app) as client:
        collection = client.post(
            f"/workspaces/{seeded.workspace_id}/collections",
            json={"name": "Revenue"},
            headers=headers,
        )
        collection_id = collection.json()["id"]
        client.post(
            f"/workspaces/{seeded.workspace_id}/questions",
            json={
                "collection_id": collection_id,
                "title": "ARR",
                "sql_text": "SELECT 1",
                "parameters": [],
            },
            headers=headers,
        )
        blocked = client.delete(
            f"/workspaces/{seeded.workspace_id}/collections/{collection_id}",
            headers=headers,
        )
    assert blocked.status_code == 409
    assert blocked.json()["error_code"] == "collection_not_empty"


def test_stale_collection_update_rejected(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_workspace_with_author(actor_role=MembershipRole.analyst))
    headers = _headers(monkeypatch, seeded)

    with TestClient(app) as client:
        created = client.post(
            f"/workspaces/{seeded.workspace_id}/collections",
            json={"name": "Revenue"},
            headers=headers,
        )
        collection_id = created.json()["id"]
        stale = client.patch(
            f"/workspaces/{seeded.workspace_id}/collections/{collection_id}",
            json={
                "expected_updated_at": "2000-01-01T00:00:00+00:00",
                "name": "Stale",
            },
            headers=headers,
        )
    assert stale.status_code == 409
    assert stale.json()["error_code"] == "stale_update"


def test_stale_question_update_rejected(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_workspace_with_author(actor_role=MembershipRole.analyst))
    headers = _headers(monkeypatch, seeded)

    with TestClient(app) as client:
        collection_id = client.post(
            f"/workspaces/{seeded.workspace_id}/collections",
            json={"name": "Revenue"},
            headers=headers,
        ).json()["id"]
        question = client.post(
            f"/workspaces/{seeded.workspace_id}/questions",
            json={
                "collection_id": collection_id,
                "title": "ARR",
                "sql_text": "SELECT 1",
                "parameters": [],
            },
            headers=headers,
        )
        question_id = question.json()["id"]
        stale = client.patch(
            f"/workspaces/{seeded.workspace_id}/questions/{question_id}",
            json={
                "expected_updated_at": "2000-01-01T00:00:00+00:00",
                "title": "Stale",
            },
            headers=headers,
        )
    assert stale.status_code == 409
    assert stale.json()["error_code"] == "stale_update"


def test_cache_invalidated_on_sql_or_schema_change(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(
        seed_workspace_with_author(
            actor_role=MembershipRole.analyst,
            with_connection=True,
        )
    )
    assert seeded.connection_id is not None
    headers = _headers(monkeypatch, seeded)

    with TestClient(app) as client:
        collection_id = client.post(
            f"/workspaces/{seeded.workspace_id}/collections",
            json={"name": "Revenue"},
            headers=headers,
        ).json()["id"]
        question = client.post(
            f"/workspaces/{seeded.workspace_id}/questions",
            json={
                "collection_id": collection_id,
                "title": "ARR",
                "sql_text": "SELECT 1",
                "parameters": [],
            },
            headers=headers,
        )
        question_id = uuid.UUID(question.json()["id"])
        updated_at = question.json()["updated_at"]

    async def _seed_cache() -> None:
        from app.db.session import get_async_session_maker

        maker = get_async_session_maker()
        async with maker() as session:
            session.add(
                CacheEntry(
                    tenant_id=seeded.tenant_id,
                    connection_id=seeded.connection_id,
                    secret_version=1,
                    cache_key=f"sq-{question_id}",
                    payload={"saved_question_id": str(question_id), "rows": []},
                    expires_at=datetime.now(UTC) + timedelta(hours=1),
                    presentation_class=PresentationClass.table,
                )
            )
            await session.commit()

    async def _count_cache() -> int:
        from app.db.session import get_async_session_maker

        maker = get_async_session_maker()
        async with maker() as session:
            stmt = (
                select(func.count())
                .select_from(CacheEntry)
                .where(
                    CacheEntry.tenant_id == seeded.tenant_id,
                    CacheEntry.payload["saved_question_id"].as_string()
                    == str(question_id),
                )
            )
            return int((await session.execute(stmt)).scalar_one())

    asyncio.run(_seed_cache())
    assert asyncio.run(_count_cache()) == 1

    with TestClient(app) as client:
        patched = client.patch(
            f"/workspaces/{seeded.workspace_id}/questions/{question_id}",
            json={
                "expected_updated_at": updated_at,
                "sql_text": "SELECT 2",
            },
            headers=headers,
        )
        assert patched.status_code == 200

    assert asyncio.run(_count_cache()) == 0

    asyncio.run(_seed_cache())
    assert asyncio.run(_count_cache()) == 1

    with TestClient(app) as client:
        detail = client.get(
            f"/workspaces/{seeded.workspace_id}/questions/{question_id}",
            headers=headers,
        )
        assert detail.status_code == 200
        schema_patch = client.patch(
            f"/workspaces/{seeded.workspace_id}/questions/{question_id}",
            json={
                "expected_updated_at": detail.json()["updated_at"],
                "parameters": [
                    {
                        "name": "region",
                        "type": "string",
                        "required": True,
                    }
                ],
            },
            headers=headers,
        )
        assert schema_patch.status_code == 200

    assert asyncio.run(_count_cache()) == 0
