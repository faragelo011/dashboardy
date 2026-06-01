"""Feature 4 timeout and row-limit outcome tests."""

from __future__ import annotations

import uuid
from types import SimpleNamespace

import pytest
from app.models.auth_tenancy import MembershipRole, MembershipStatus
from app.models.data_connections import DataConnection, DbConnectionStatus
from app.models.query_engine import QueryAuditLog
from app.query_engine.enums import ExecutionStatus
from app.query_engine.pipeline import execute_workspace_query
from app.query_engine.schemas import AdhocQueryExecuteRequest
from app.query_engine.snowflake_run import SnowflakeSelectOutcome
from app.tenancy.resolver import ResolvedTenancy
from sqlalchemy import select

from tests.factories import auth_tenancy as auth_factories


async def _seed_analyst_connection() -> tuple[uuid.UUID, ResolvedTenancy, object]:
    from app.db.session import get_async_session_maker

    maker = get_async_session_maker()
    user_id = uuid.uuid4()
    async with maker() as session:
        tenant = await auth_factories.create_tenant(session)
        workspace = await auth_factories.create_workspace(session, tenant=tenant)
        membership = await auth_factories.create_membership(
            session,
            tenant=tenant,
            workspace=workspace,
            user_id=user_id,
            role=MembershipRole.analyst,
            status=MembershipStatus.active,
        )
        conn = DataConnection(
            tenant_id=tenant.id,
            name="Outcome test",
            warehouse="WH",
            database="DB",
            schema_="PUBLIC",
            status=DbConnectionStatus.active,
            vault_secret_id="vault",
            created_by_membership_id=membership.id,
            updated_by_membership_id=membership.id,
        )
        session.add(conn)
        await session.flush()
        tenancy = ResolvedTenancy(
            tenant_id=tenant.id,
            workspace_id=workspace.id,
            workspace_name=workspace.name,
            membership_id=membership.id,
            role=membership.role,
            membership_status=membership.status,
        )
        conn_stub = SimpleNamespace(id=conn.id, secret_version=conn.secret_version)
        await session.commit()

    class _ConnSvc:
        async def resolve_active_execution_credentials(self, *, session, tenant_id):  # noqa: ARG002
            assert tenant_id == tenancy.tenant_id
            return conn_stub, {
                "account": "acct",
                "username": "user",
                "password": "pw",
                "role": "SYSADMIN",
            }

    return user_id, tenancy, _ConnSvc()


async def _latest_audit(session, tenant_id: uuid.UUID) -> QueryAuditLog:
    stmt = (
        select(QueryAuditLog)
        .where(QueryAuditLog.tenant_id == tenant_id)
        .order_by(QueryAuditLog.created_at.desc())
        .limit(1)
    )
    return (await session.execute(stmt)).scalar_one()


@pytest.mark.asyncio
async def test_timeout_outcome_returns_200_meta_and_audit(
    use_live_postgres: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def _timeout(*_args, **_kwargs) -> SnowflakeSelectOutcome:
        return SnowflakeSelectOutcome(
            column_names=[],
            column_types=[],
            rows=[],
            status=ExecutionStatus.timeout,
            truncated=False,
            snowflake_wall_ms=30_000,
            bytes_scanned=None,
            message="statement timed out",
        )

    monkeypatch.setattr("app.query_engine.pipeline.execute_snowflake_select", _timeout)
    user_id, tenancy, service = await _seed_analyst_connection()

    from app.db.session import get_async_session_maker

    maker = get_async_session_maker()
    async with maker() as session:
        response = await execute_workspace_query(
            session,
            tenancy=tenancy,
            auth_user_id=user_id,
            payload=AdhocQueryExecuteRequest(sql_text="SELECT 1"),
            connection_service=service,
        )

        assert response.meta.status == ExecutionStatus.timeout
        assert response.meta.error_code == "warehouse_timeout"
        audit = await _latest_audit(session, tenancy.tenant_id)
        assert audit.status == ExecutionStatus.timeout
        assert audit.error_code == "warehouse_timeout"


@pytest.mark.asyncio
async def test_row_limit_exceeded_outcome_caps_rows_and_audits(
    use_live_postgres: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def _row_limit(*_args, **_kwargs) -> SnowflakeSelectOutcome:
        return SnowflakeSelectOutcome(
            column_names=["n"],
            column_types=["INTEGER"],
            rows=[[i] for i in range(10_000)],
            status=ExecutionStatus.row_limit_exceeded,
            truncated=True,
            snowflake_wall_ms=10,
            bytes_scanned=None,
            message=None,
        )

    monkeypatch.setattr(
        "app.query_engine.pipeline.execute_snowflake_select",
        _row_limit,
    )
    user_id, tenancy, service = await _seed_analyst_connection()

    from app.db.session import get_async_session_maker

    maker = get_async_session_maker()
    async with maker() as session:
        response = await execute_workspace_query(
            session,
            tenancy=tenancy,
            auth_user_id=user_id,
            payload=AdhocQueryExecuteRequest(sql_text="SELECT 1"),
            connection_service=service,
        )

        assert response.meta.status == ExecutionStatus.row_limit_exceeded
        assert response.meta.truncated is True
        assert response.meta.row_count == 10_000
        assert len(response.rows) == 10_000
        audit = await _latest_audit(session, tenancy.tenant_id)
        assert audit.status == ExecutionStatus.row_limit_exceeded
        assert audit.row_count == 10_000
