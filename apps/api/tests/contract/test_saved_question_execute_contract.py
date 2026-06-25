"""Contract checks for saved-question execute endpoint (US2)."""

from __future__ import annotations

import asyncio
import uuid
from types import SimpleNamespace

import pytest
from app.main import app
from app.models.auth_tenancy import MembershipRole
from app.query_engine.enums import ExecutionStatus
from app.query_engine.snowflake_run import SnowflakeSelectOutcome
from fastapi.testclient import TestClient

from tests.saved_questions_fixtures import seed_workspace_with_author


def _snowflake_ok() -> SnowflakeSelectOutcome:
    return SnowflakeSelectOutcome(
        column_names=["amount"],
        column_types=["INTEGER"],
        rows=[[1]],
        status=ExecutionStatus.ok,
        truncated=False,
        snowflake_wall_ms=1,
        bytes_scanned=None,
        message=None,
    )


def _patch_snowflake(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _sf(*_a, **_k):
        return _snowflake_ok()

    monkeypatch.setattr("app.query_engine.pipeline.execute_snowflake_select", _sf)


def _patch_connection(
    monkeypatch: pytest.MonkeyPatch,
    connection_id: uuid.UUID,
) -> None:
    conn_stub = SimpleNamespace(id=connection_id, secret_version=1)

    class _ConnSvc:
        async def resolve_active_execution_credentials(
            self, *, session, tenant_id
        ):  # noqa: ARG002
            creds = {
                "account": "a",
                "username": "u",
                "password": "p",
                "role": "r",
            }
            return conn_stub, creds

    monkeypatch.setattr(
        "app.routes.questions.get_connection_service",
        lambda vault_required=True: _ConnSvc(),  # noqa: ARG005
    )


def test_execute_saved_question_success(
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
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.actor_user_id), "email": "analyst@example.com"},
    )
    _patch_snowflake(monkeypatch)
    _patch_connection(monkeypatch, seeded.connection_id)
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        collection_id = client.post(
            f"/workspaces/{seeded.workspace_id}/collections",
            json={"name": "Revenue"},
            headers=headers,
        ).json()["id"]
        question_id = client.post(
            f"/workspaces/{seeded.workspace_id}/questions",
            json={
                "collection_id": collection_id,
                "title": "ARR",
                "sql_text": "SELECT 1 AS amount",
                "parameters": [],
            },
            headers=headers,
        ).json()["id"]
        executed = client.post(
            f"/workspaces/{seeded.workspace_id}/questions/{question_id}/execute",
            json={"parameters": {}, "bypass_cache": False},
            headers=headers,
        )
    assert executed.status_code == 200
    body = executed.json()
    assert body["meta"]["status"] == "ok"
    assert body["meta"]["cache_hit"] is False
    assert len(body["rows"]) >= 1


def test_execute_invalid_parameters_returns_422(
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
        collection_id = client.post(
            f"/workspaces/{seeded.workspace_id}/collections",
            json={"name": "Revenue"},
            headers=headers,
        ).json()["id"]
        question_id = client.post(
            f"/workspaces/{seeded.workspace_id}/questions",
            json={
                "collection_id": collection_id,
                "title": "ARR",
                "sql_text": "SELECT 1",
                "parameters": [
                    {"name": "region", "type": "string", "required": True},
                ],
            },
            headers=headers,
        ).json()["id"]
        executed = client.post(
            f"/workspaces/{seeded.workspace_id}/questions/{question_id}/execute",
            json={"parameters": {}, "bypass_cache": False},
            headers=headers,
        )
    assert executed.status_code == 422
    assert executed.json()["error_code"] == "invalid_parameters"


def test_execute_bypass_cache_flag_accepted(
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
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.actor_user_id), "email": "analyst@example.com"},
    )
    _patch_snowflake(monkeypatch)
    _patch_connection(monkeypatch, seeded.connection_id)
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        collection_id = client.post(
            f"/workspaces/{seeded.workspace_id}/collections",
            json={"name": "Revenue"},
            headers=headers,
        ).json()["id"]
        question_id = client.post(
            f"/workspaces/{seeded.workspace_id}/questions",
            json={
                "collection_id": collection_id,
                "title": "ARR",
                "sql_text": "SELECT 1 AS amount",
                "parameters": [],
            },
            headers=headers,
        ).json()["id"]
        executed = client.post(
            f"/workspaces/{seeded.workspace_id}/questions/{question_id}/execute",
            json={"parameters": {}, "bypass_cache": True},
            headers=headers,
        )
    assert executed.status_code == 200
    assert executed.json()["meta"]["cache_hit"] is False
