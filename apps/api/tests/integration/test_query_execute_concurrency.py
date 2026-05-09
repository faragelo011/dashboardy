"""Concurrency gate for query execution (US2 / Phase 4).

Uses a live Postgres schema for audit inserts and stubs Snowflake I/O so CI does not
need warehouse credentials. Validates ``warehouse_busy`` → HTTP **429** contract.
"""

from __future__ import annotations

import asyncio
import uuid
from types import SimpleNamespace

import pytest
from app.models.auth_tenancy import MembershipRole, MembershipStatus
from app.models.data_connections import DataConnection, DbConnectionStatus
from app.query_engine.enums import ExecutionStatus
from app.query_engine.pipeline import execute_workspace_query
from app.query_engine.schemas import AdhocQueryExecuteRequest
from app.query_engine.snowflake_run import SnowflakeSelectOutcome
from app.tenancy.resolver import ResolvedTenancy
from fastapi import HTTPException

from tests.factories import auth_tenancy as auth_factories


@pytest.fixture(autouse=True)
def _reset_query_engine_gate() -> None:
    import app.query_engine.queue as query_queue

    query_queue._rt = None
    yield
    query_queue._rt = None


def _success_outcome() -> SnowflakeSelectOutcome:
    return SnowflakeSelectOutcome(
        column_names=["c"],
        column_types=["INTEGER"],
        rows=[[1]],
        status=ExecutionStatus.ok,
        truncated=False,
        snowflake_wall_ms=0,
        bytes_scanned=None,
        message=None,
    )


async def _seed_analyst_workspace_with_active_connection() -> tuple[
    uuid.UUID,
    uuid.UUID,
    uuid.UUID,
    uuid.UUID,
    uuid.UUID,
]:
    from app.db.session import get_async_session_maker

    maker = get_async_session_maker()
    async with maker() as session:
        tenant = await auth_factories.create_tenant(session)
        workspace = await auth_factories.create_workspace(session, tenant=tenant)
        membership = await auth_factories.create_membership(
            session,
            tenant=tenant,
            workspace=workspace,
            role=MembershipRole.analyst,
            status=MembershipStatus.active,
            user_id=uuid.uuid4(),
        )
        conn = DataConnection(
            tenant_id=tenant.id,
            name="Concurrency test",
            warehouse="WH",
            database="DB",
            schema_="PUBLIC",
            status=DbConnectionStatus.active,
            vault_secret_id="vault-ref",
            created_by_membership_id=membership.id,
            updated_by_membership_id=membership.id,
        )
        session.add(conn)
        await session.flush()
        user_id = membership.user_id
        conn_id = conn.id
        tid = tenant.id
        ws_id = workspace.id
        mid = membership.id
        await session.commit()
    return user_id, tid, ws_id, mid, conn_id


async def _run_attempt(
    *,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    workspace_id: uuid.UUID,
    membership_id: uuid.UUID,
    connection_service: object,
) -> tuple[int, object | None]:
    from app.db.session import get_async_session_maker

    maker = get_async_session_maker()
    async with maker() as session:
        tenancy = ResolvedTenancy(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            workspace_name="Default",
            membership_id=membership_id,
            role=MembershipRole.analyst,
            membership_status=MembershipStatus.active,
        )
        payload = AdhocQueryExecuteRequest(sql_text="SELECT 1")
        try:
            await execute_workspace_query(
                session,
                tenancy=tenancy,
                auth_user_id=user_id,
                payload=payload,
                connection_service=connection_service,
            )
        except HTTPException as exc:
            await session.commit()
            return exc.status_code, exc.detail
        await session.commit()
        return 200, None


@pytest.mark.asyncio
async def test_slot_wait_timeout_returns_429_warehouse_busy(
    use_live_postgres: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("QUERY_ENGINE_CONCURRENT_SNOWFLAKE_EXECUTIONS", "2")
    monkeypatch.setenv("QUERY_ENGINE_EXECUTION_SLOT_WAIT_SECONDS", "1")

    user_id, tenant_id, workspace_id, membership_id, connection_id = (
        await _seed_analyst_workspace_with_active_connection()
    )
    secret = {
        "account": "acct",
        "username": "user",
        "password": "pw",
        "role": "SYSADMIN",
    }
    conn_row = SimpleNamespace(id=connection_id, secret_version=0)

    class _StubConnectionService:
        async def resolve_active_execution_credentials(
            self, *, session, tenant_id
        ):  # noqa: ARG002
            return conn_row, secret

    service = _StubConnectionService()
    slow = 3.0

    async def _slow_sf(*_args, **_kwargs) -> SnowflakeSelectOutcome:
        await asyncio.sleep(slow)
        return _success_outcome()

    monkeypatch.setattr(
        "app.query_engine.pipeline.execute_snowflake_select",
        _slow_sf,
    )

    results = await asyncio.gather(
        *[
            _run_attempt(
                user_id=user_id,
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                membership_id=membership_id,
                connection_service=service,
            )
            for _ in range(3)
        ],
    )
    busy = [r for r in results if r[0] == 429]
    assert busy, f"expected at least one 429, got {results}"
    assert all(
        isinstance(b[1], dict) and b[1].get("error_code") == "warehouse_busy"
        for b in busy
    )
    assert sum(1 for r in results if r[0] == 200) == 2


@pytest.mark.asyncio
async def test_wait_buffer_full_returns_429_warehouse_busy(
    use_live_postgres: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("QUERY_ENGINE_CONCURRENT_SNOWFLAKE_EXECUTIONS", "1")
    monkeypatch.setenv("QUERY_ENGINE_WAITING_REQUESTS_QUEUE_DEPTH", "1")
    monkeypatch.setenv("QUERY_ENGINE_EXECUTION_SLOT_WAIT_SECONDS", "5")

    user_id, tenant_id, workspace_id, membership_id, connection_id = (
        await _seed_analyst_workspace_with_active_connection()
    )
    secret = {
        "account": "acct",
        "username": "user",
        "password": "pw",
        "role": "SYSADMIN",
    }
    conn_row = SimpleNamespace(id=connection_id, secret_version=0)

    class _StubConnectionService:
        async def resolve_active_execution_credentials(
            self, *, session, tenant_id
        ):  # noqa: ARG002
            return conn_row, secret

    service = _StubConnectionService()
    slow = 12.0

    async def _slow_sf(*_args, **_kwargs) -> SnowflakeSelectOutcome:
        await asyncio.sleep(slow)
        return _success_outcome()

    monkeypatch.setattr(
        "app.query_engine.pipeline.execute_snowflake_select",
        _slow_sf,
    )

    results = await asyncio.gather(
        *[
            _run_attempt(
                user_id=user_id,
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                membership_id=membership_id,
                connection_service=service,
            )
            for _ in range(4)
        ],
    )
    busy = [r for r in results if r[0] == 429]
    assert len(busy) >= 2, results
    assert all(
        isinstance(b[1], dict) and b[1].get("error_code") == "warehouse_busy"
        for b in busy
    )
    assert sum(1 for r in results if r[0] == 200) == 1
