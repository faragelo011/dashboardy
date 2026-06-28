"""Contract checks for saved-question CSV export endpoint (US4)."""

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

from tests.saved_questions_fixtures import (
    seed_question_catalog,
    seed_workspace_with_author,
)


def _snowflake_ok() -> SnowflakeSelectOutcome:
    return SnowflakeSelectOutcome(
        column_names=["region", "amount"],
        column_types=["STRING", "INTEGER"],
        rows=[["EMEA", 42]],
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


def _create_collection(
    client: TestClient,
    workspace_id: uuid.UUID,
    headers: dict,
) -> str:
    response = client.post(
        f"/workspaces/{workspace_id}/collections",
        json={"name": "Revenue"},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["id"]


def _create_question(
    client: TestClient,
    workspace_id: uuid.UUID,
    headers: dict,
    *,
    collection_id: str,
) -> str:
    response = client.post(
        f"/workspaces/{workspace_id}/questions",
        json={
            "collection_id": collection_id,
            "title": "Monthly revenue",
            "description": "KPI",
            "sql_text": "SELECT %(region)s AS region, 42 AS amount",
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
    assert response.status_code == 201
    return response.json()["id"]


def test_export_saved_question_success(
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
        collection_id = _create_collection(client, seeded.workspace_id, headers)
        question_id = _create_question(
            client,
            seeded.workspace_id,
            headers,
            collection_id=collection_id,
        )
        exported = client.get(
            f"/workspaces/{seeded.workspace_id}/questions/{question_id}/export.csv",
            params={"parameters[region]": "EMEA"},
            headers=headers,
        )

    assert exported.status_code == 200
    assert exported.headers["content-type"].startswith("text/csv")
    assert exported.text.splitlines()[0] == "region,amount"
    assert "EMEA,42" in exported.text


def test_export_forbidden_for_external_client_without_grant(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog(grant_external_export=False))
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.external_user_id), "email": "client@example.com"},
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        exported = client.get(
            f"/workspaces/{seeded.workspace_id}/questions/{seeded.question_id}/export.csv",
            params={"parameters[region]": "EMEA"},
            headers=headers,
        )

    assert exported.status_code == 403
    assert exported.json()["error_code"] == "export_not_permitted"


def test_export_rejects_invalid_parameters(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seeded = asyncio.run(seed_question_catalog())
    monkeypatch.setattr(
        "app.auth_context.dependencies.decode_supabase_jwt",
        lambda _t: {"sub": str(seeded.admin_user_id), "email": "admin@example.com"},
    )
    headers = {"Authorization": "Bearer fake"}

    with TestClient(app) as client:
        exported = client.get(
            f"/workspaces/{seeded.workspace_id}/questions/{seeded.question_id}/export.csv",
            params={"parameters[region]": "EMEA", "parameters[extra]": "x"},
            headers=headers,
        )

    assert exported.status_code == 422
    assert exported.json()["error_code"] == "invalid_parameters"
    assert "text/csv" not in exported.headers.get("content-type", "")
