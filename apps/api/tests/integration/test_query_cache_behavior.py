"""US3 / Phase 5 cache: hit/miss, bypass, ad hoc exclusion, auth re-check."""

from __future__ import annotations

import uuid
from types import SimpleNamespace

import pytest
from app.models.auth_tenancy import MembershipRole, MembershipStatus
from app.models.data_connections import DataConnection, DbConnectionStatus
from app.models.query_engine import CacheEntry
from app.query_engine.enums import ExecutionStatus, PresentationClass
from app.query_engine.pipeline import execute_workspace_query
from app.query_engine.schemas import (
    AdhocQueryExecuteRequest,
    SavedQuestionQueryExecuteRequest,
    WidgetQueryExecuteRequest,
)
from app.query_engine.snowflake_run import SnowflakeSelectOutcome
from app.tenancy.permissions import PermissionDecision, PermissionReason
from app.tenancy.resolver import ResolvedTenancy
from sqlalchemy import func, select

from tests.factories import auth_tenancy as auth_factories


@pytest.fixture(autouse=True)
def _reset_query_engine_gate() -> None:
    import app.query_engine.queue as query_queue

    query_queue._rt = None
    yield
    query_queue._rt = None


def _snowflake_ok() -> SnowflakeSelectOutcome:
    return SnowflakeSelectOutcome(
        column_names=["n"],
        column_types=["INTEGER"],
        rows=[[42]],
        status=ExecutionStatus.ok,
        truncated=False,
        snowflake_wall_ms=1,
        bytes_scanned=None,
        message=None,
    )


async def _allow_modality(*_args, **_kwargs) -> PermissionDecision:
    return PermissionDecision(True, PermissionReason.allowed)


async def _seed_workspace_connection() -> tuple[
    uuid.UUID,
    ResolvedTenancy,
    object,
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
            user_id=uuid.uuid4(),
            role=MembershipRole.analyst,
            status=MembershipStatus.active,
        )
        conn = DataConnection(
            tenant_id=tenant.id,
            name="cache test",
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
        uid = membership.user_id
        conn_stub = SimpleNamespace(id=conn.id, secret_version=conn.secret_version)
        secret = {
            "account": "a",
            "username": "u",
            "password": "p",
            "role": "r",
        }
        await session.commit()

    class _ConnSvc:
        async def resolve_active_execution_credentials(self, *, session, tenant_id):  # noqa: ARG002
            assert tenant_id == tenant.id
            return conn_stub, secret

    return uid, tenancy, _ConnSvc()


async def _count_cache(session, tenant_id: uuid.UUID) -> int:
    stmt = (
        select(func.count())
        .select_from(CacheEntry)
        .where(CacheEntry.tenant_id == tenant_id)
    )
    return int((await session.execute(stmt)).scalar_one())


@pytest.mark.asyncio
async def test_saved_question_second_call_is_cache_hit(
    use_live_postgres: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    sq_id = uuid.uuid4()

    async def _resolve(_s, *, tenant_id, payload):  # noqa: ARG001
        _ = tenant_id
        assert payload.saved_question_id == sq_id
        return ("SELECT 1", {})

    monkeypatch.setattr(
        "app.query_engine.pipeline.resolve_modal_sql",
        _resolve,
    )
    monkeypatch.setattr(
        "app.query_engine.pipeline.authorize_query_modality",
        _allow_modality,
    )

    async def _sf(*_a, **_k):
        return _snowflake_ok()

    monkeypatch.setattr("app.query_engine.pipeline.execute_snowflake_select", _sf)

    user_id, tenancy, svc = await _seed_workspace_connection()
    payload = SavedQuestionQueryExecuteRequest(
        saved_question_id=sq_id,
        presentation_class=PresentationClass.kpi,
        parameters={},
        bypass_cache=False,
    )

    from app.db.session import get_async_session_maker

    maker = get_async_session_maker()
    async with maker() as s:
        r1 = await execute_workspace_query(
            s,
            tenancy=tenancy,
            auth_user_id=user_id,
            payload=payload,
            connection_service=svc,
        )
        await s.commit()
        assert r1.meta.cache_hit is False

    async with maker() as s:
        n_cached = await _count_cache(s, tenancy.tenant_id)
        assert n_cached == 1
        r2 = await execute_workspace_query(
            s,
            tenancy=tenancy,
            auth_user_id=user_id,
            payload=payload,
            connection_service=svc,
        )
        await s.commit()
        assert r2.meta.cache_hit is True
        assert r2.rows == r1.rows


@pytest.mark.asyncio
async def test_bypass_cache_skips_read_and_write(
    use_live_postgres: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    sq_id = uuid.uuid4()
    calls = {"sf": 0}

    async def _resolve(_s, *, tenant_id, payload):  # noqa: ARG001
        _ = tenant_id
        _ = payload
        return ("SELECT 1", {})

    monkeypatch.setattr("app.query_engine.pipeline.resolve_modal_sql", _resolve)
    monkeypatch.setattr(
        "app.query_engine.pipeline.authorize_query_modality",
        _allow_modality,
    )

    async def _sf(*_a, **_k):
        calls["sf"] += 1
        return _snowflake_ok()

    monkeypatch.setattr("app.query_engine.pipeline.execute_snowflake_select", _sf)

    user_id, tenancy, svc = await _seed_workspace_connection()

    from app.db.session import get_async_session_maker

    maker = get_async_session_maker()
    async with maker() as s:
        await execute_workspace_query(
            s,
            tenancy=tenancy,
            auth_user_id=user_id,
            payload=SavedQuestionQueryExecuteRequest(
                saved_question_id=sq_id,
                presentation_class=PresentationClass.kpi,
                bypass_cache=True,
            ),
            connection_service=svc,
        )
        await s.commit()

    async with maker() as s:
        assert await _count_cache(s, tenancy.tenant_id) == 0

    async with maker() as s:
        r = await execute_workspace_query(
            s,
            tenancy=tenancy,
            auth_user_id=user_id,
            payload=SavedQuestionQueryExecuteRequest(
                saved_question_id=sq_id,
                presentation_class=PresentationClass.kpi,
                bypass_cache=False,
            ),
            connection_service=svc,
        )
        await s.commit()
        assert r.meta.cache_hit is False

    assert calls["sf"] == 2

    async with maker() as s:
        r2 = await execute_workspace_query(
            s,
            tenancy=tenancy,
            auth_user_id=user_id,
            payload=SavedQuestionQueryExecuteRequest(
                saved_question_id=sq_id,
                presentation_class=PresentationClass.kpi,
                bypass_cache=False,
            ),
            connection_service=svc,
        )
        await s.commit()
        assert r2.meta.cache_hit is True

    assert calls["sf"] == 2


@pytest.mark.asyncio
async def test_adhoc_execution_does_not_persist_cache_rows(
    use_live_postgres: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def _sf(*_a, **_k):
        return _snowflake_ok()

    monkeypatch.setattr("app.query_engine.pipeline.execute_snowflake_select", _sf)

    user_id, tenancy, svc = await _seed_workspace_connection()
    from app.db.session import get_async_session_maker

    maker = get_async_session_maker()
    async with maker() as s:
        await execute_workspace_query(
            s,
            tenancy=tenancy,
            auth_user_id=user_id,
            payload=AdhocQueryExecuteRequest(sql_text="SELECT 1"),
            connection_service=svc,
        )
        await s.commit()

    async with maker() as s:
        assert await _count_cache(s, tenancy.tenant_id) == 0


@pytest.mark.asyncio
async def test_widget_mode_second_call_is_cache_hit(
    use_live_postgres: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    dash_id = uuid.uuid4()
    wid = uuid.uuid4()
    sq_id = uuid.uuid4()

    async def _resolve(_s, *, tenant_id, payload):  # noqa: ARG001
        _ = tenant_id
        assert isinstance(payload, WidgetQueryExecuteRequest)
        assert payload.widget_id == wid
        return ("SELECT 1", {})

    monkeypatch.setattr("app.query_engine.pipeline.resolve_modal_sql", _resolve)
    monkeypatch.setattr(
        "app.query_engine.pipeline.authorize_query_modality",
        _allow_modality,
    )

    async def _sf(*_a, **_k):
        return _snowflake_ok()

    monkeypatch.setattr(
        "app.query_engine.pipeline.execute_snowflake_select",
        _sf,
    )

    user_id, tenancy, svc = await _seed_workspace_connection()
    payload = WidgetQueryExecuteRequest(
        dashboard_id=dash_id,
        widget_id=wid,
        saved_question_id=sq_id,
        presentation_class=PresentationClass.chart,
    )

    from app.db.session import get_async_session_maker

    maker = get_async_session_maker()
    async with maker() as s:
        r1 = await execute_workspace_query(
            s,
            tenancy=tenancy,
            auth_user_id=user_id,
            payload=payload,
            connection_service=svc,
        )
        await s.commit()
        assert r1.meta.cache_hit is False
    async with maker() as s:
        r2 = await execute_workspace_query(
            s,
            tenancy=tenancy,
            auth_user_id=user_id,
            payload=payload,
            connection_service=svc,
        )
        await s.commit()
        assert r2.meta.cache_hit is True


@pytest.mark.asyncio
async def test_cache_hit_rechecks_modality_auth_before_serving(
    use_live_postgres: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    sq_id = uuid.uuid4()

    async def _resolve(_s, *, tenant_id, payload):  # noqa: ARG001
        _ = tenant_id
        _ = payload
        return ("SELECT 1", {})

    monkeypatch.setattr("app.query_engine.pipeline.resolve_modal_sql", _resolve)

    sf_calls = {"n": 0}

    async def _sf(*_a, **_k):
        sf_calls["n"] += 1
        return _snowflake_ok()

    monkeypatch.setattr("app.query_engine.pipeline.execute_snowflake_select", _sf)

    decisions = iter(
        [
            PermissionDecision(True, PermissionReason.allowed),
            PermissionDecision(True, PermissionReason.allowed),
            PermissionDecision(False, PermissionReason.role_not_allowed),
        ]
    )

    async def _flaky_modality(session, tenancy, body):  # noqa: ARG001
        _ = session
        _ = tenancy
        _ = body
        return next(decisions)

    monkeypatch.setattr(
        "app.query_engine.pipeline.authorize_query_modality",
        _flaky_modality,
    )

    user_id, tenancy, svc = await _seed_workspace_connection()
    payload = SavedQuestionQueryExecuteRequest(
        saved_question_id=sq_id,
        presentation_class=PresentationClass.kpi,
    )

    from app.db.session import get_async_session_maker

    maker = get_async_session_maker()
    async with maker() as s:
        r1 = await execute_workspace_query(
            s,
            tenancy=tenancy,
            auth_user_id=user_id,
            payload=payload,
            connection_service=svc,
        )
        await s.commit()
        assert r1.meta.cache_hit is False

    async with maker() as s:
        r2 = await execute_workspace_query(
            s,
            tenancy=tenancy,
            auth_user_id=user_id,
            payload=payload,
            connection_service=svc,
        )
        await s.commit()
        assert r2.meta.cache_hit is False

    assert sf_calls["n"] == 2
