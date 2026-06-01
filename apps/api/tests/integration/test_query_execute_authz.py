"""Feature 4 authorization and disabled-mode regression tests."""

from __future__ import annotations

import uuid
from typing import Any

import pytest
from app.models.auth_tenancy import MembershipRole, MembershipStatus
from app.models.query_engine import QueryAuditLog
from app.query_engine.enums import ExecutionStatus, PresentationClass
from app.query_engine.pipeline import execute_workspace_query
from app.query_engine.schemas import (
    AdhocQueryExecuteRequest,
    SavedQuestionQueryExecuteRequest,
    WidgetQueryExecuteRequest,
)
from app.tenancy.resolver import ResolvedTenancy
from fastapi import HTTPException
from sqlalchemy import select

from tests.factories import auth_tenancy as auth_factories


async def _seed_tenancy(role: MembershipRole) -> tuple[uuid.UUID, ResolvedTenancy]:
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
            role=role,
            status=MembershipStatus.active,
        )
        tenancy = ResolvedTenancy(
            tenant_id=tenant.id,
            workspace_id=workspace.id,
            workspace_name=workspace.name,
            membership_id=membership.id,
            role=membership.role,
            membership_status=membership.status,
        )
        await session.commit()
    return user_id, tenancy


async def _latest_audit(session, tenant_id: uuid.UUID) -> QueryAuditLog:
    stmt = (
        select(QueryAuditLog)
        .where(QueryAuditLog.tenant_id == tenant_id)
        .order_by(QueryAuditLog.created_at.desc())
        .limit(1)
    )
    row = (await session.execute(stmt)).scalar_one()
    return row


class _FailingConnectionService:
    async def resolve_active_execution_credentials(self, **_kwargs: Any) -> None:
        raise AssertionError("Connection resolution must not run for denied requests")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "role",
    [MembershipRole.viewer, MembershipRole.external_client],
)
async def test_viewer_and_external_client_denied_before_parser_or_snowflake(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
    role: MembershipRole,
) -> None:
    def _parser_must_not_run(*_args: Any, **_kwargs: Any) -> tuple[str, str, str]:
        raise AssertionError("Parser must not run for denied ad hoc requests")

    monkeypatch.setattr(
        "app.query_engine.pipeline.prepare_adhoc_sql_hashes",
        _parser_must_not_run,
    )
    user_id, tenancy = await _seed_tenancy(role)

    from app.db.session import get_async_session_maker

    maker = get_async_session_maker()
    async with maker() as session:
        with pytest.raises(HTTPException) as excinfo:
            await execute_workspace_query(
                session,
                tenancy=tenancy,
                auth_user_id=user_id,
                payload=AdhocQueryExecuteRequest(sql_text="SELECT 1"),
                connection_service=_FailingConnectionService(),
            )

        assert excinfo.value.status_code == 403
        assert excinfo.value.detail["error_code"] == "authz_denied"
        audit = await _latest_audit(session, tenancy.tenant_id)
        assert audit.status == ExecutionStatus.authz_denied
        assert audit.error_code == "authz_denied"


@pytest.mark.asyncio
async def test_saved_question_disabled_before_parser_or_snowflake(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.query_engine.pipeline.prepare_adhoc_sql_hashes",
        lambda *_args, **_kwargs: pytest.fail("Parser must not run"),
    )
    user_id, tenancy = await _seed_tenancy(MembershipRole.analyst)

    from app.db.session import get_async_session_maker

    maker = get_async_session_maker()
    async with maker() as session:
        with pytest.raises(HTTPException) as excinfo:
            await execute_workspace_query(
                session,
                tenancy=tenancy,
                auth_user_id=user_id,
                payload=SavedQuestionQueryExecuteRequest(
                    saved_question_id=uuid.uuid4(),
                    presentation_class=PresentationClass.kpi,
                ),
                connection_service=_FailingConnectionService(),
            )

        assert excinfo.value.status_code == 403
        assert excinfo.value.detail["error_code"] == "saved_question_not_implemented"
        audit = await _latest_audit(session, tenancy.tenant_id)
        assert audit.status == ExecutionStatus.authz_denied
        assert audit.error_code == "saved_question_not_implemented"


@pytest.mark.asyncio
async def test_widget_disabled_before_parser_or_snowflake(
    use_live_postgres: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.query_engine.pipeline.prepare_adhoc_sql_hashes",
        lambda *_args, **_kwargs: pytest.fail("Parser must not run"),
    )
    user_id, tenancy = await _seed_tenancy(MembershipRole.analyst)

    from app.db.session import get_async_session_maker

    maker = get_async_session_maker()
    async with maker() as session:
        with pytest.raises(HTTPException) as excinfo:
            await execute_workspace_query(
                session,
                tenancy=tenancy,
                auth_user_id=user_id,
                payload=WidgetQueryExecuteRequest(
                    dashboard_id=uuid.uuid4(),
                    widget_id=uuid.uuid4(),
                    saved_question_id=uuid.uuid4(),
                    presentation_class=PresentationClass.chart,
                ),
                connection_service=_FailingConnectionService(),
            )

        assert excinfo.value.status_code == 403
        assert excinfo.value.detail["error_code"] == "feature_not_available"
        audit = await _latest_audit(session, tenancy.tenant_id)
        assert audit.status == ExecutionStatus.authz_denied
        assert audit.error_code == "feature_not_available"
