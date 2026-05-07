"""Repository-level checks for tenant scoping and failed-rotation vault retention."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

import pytest
from app.connections import repository
from app.connections.errors import ConnectionValidationError
from app.db.session import get_async_session_maker, get_engine
from app.models.auth_tenancy import MembershipRole
from app.models.data_connections import (
    DbAuditAction,
    DbAuditOutcome,
    DbConnectionStatus,
    DbConnectionTestStatus,
)

from tests.member_management_fixtures import seed_workspace_with_actor


async def _dispose_after_test() -> None:
    await get_engine().dispose()
    get_async_session_maker.cache_clear()
    get_engine.cache_clear()


def test_clear_pending_secret_preserves_effective_vault_id(
    use_live_postgres: None,
) -> None:
    """Clearing pending leaves the prior effective vault secret id unchanged."""

    async def run() -> None:
        try:
            seeded = await seed_workspace_with_actor(actor_role=MembershipRole.admin)
            maker = get_async_session_maker()
            async with maker() as session:
                conn = await repository.create_connection(
                    session,
                    tenant_id=seeded.tenant_id,
                    name="conn",
                    warehouse="wh",
                    database="db",
                    schema="PUBLIC",
                    created_by_membership_id=seeded.actor_membership_id,
                )
                conn.vault_secret_id = "vault-old"
                conn.secret_version = 1
                await session.flush()
                await repository.set_pending_secret(
                    session,
                    tenant_id=seeded.tenant_id,
                    connection_id=conn.id,
                    pending_vault_secret_id="vault-new",
                    pending_secret_version=2,
                    status=DbConnectionStatus.pending_test,
                    updated_by_membership_id=seeded.actor_membership_id,
                )
                await repository.clear_pending_secret(
                    session,
                    tenant_id=seeded.tenant_id,
                    connection_id=conn.id,
                    updated_by_membership_id=seeded.actor_membership_id,
                )
                row = await repository.get_connection_for_tenant(
                    session, tenant_id=seeded.tenant_id
                )
                assert row is not None
                assert row.vault_secret_id == "vault-old"
                assert row.secret_version == 1
                assert row.pending_vault_secret_id is None
        finally:
            await _dispose_after_test()

    asyncio.run(run())


def test_connection_mutations_require_matching_tenant(
    use_live_postgres: None,
) -> None:
    async def run() -> None:
        try:
            tenant_a = await seed_workspace_with_actor(
                actor_role=MembershipRole.admin
            )
            tenant_b = await seed_workspace_with_actor(
                actor_role=MembershipRole.admin
            )
            maker = get_async_session_maker()
            async with maker() as session:
                b_conn = await repository.create_connection(
                    session,
                    tenant_id=tenant_b.tenant_id,
                    name="b-conn",
                    warehouse="wh",
                    database="db",
                    schema=None,
                    created_by_membership_id=tenant_b.actor_membership_id,
                )
                await session.flush()
                wrong = await repository.update_connection_metadata(
                    session,
                    tenant_id=tenant_a.tenant_id,
                    connection_id=b_conn.id,
                    name="hacked",
                    warehouse="w",
                    database="d",
                    schema=None,
                    updated_by_membership_id=tenant_a.actor_membership_id,
                )
                assert wrong is None
        finally:
            await _dispose_after_test()

    asyncio.run(run())


def test_write_connection_test_result_redacts_sanitized_error(
    use_live_postgres: None,
) -> None:
    async def run() -> None:
        try:
            seeded = await seed_workspace_with_actor(actor_role=MembershipRole.admin)
            maker = get_async_session_maker()
            async with maker() as session:
                conn = await repository.create_connection(
                    session,
                    tenant_id=seeded.tenant_id,
                    name="c",
                    warehouse="wh",
                    database="db",
                    schema=None,
                    created_by_membership_id=seeded.actor_membership_id,
                )
                await session.flush()
                now = datetime.now(tz=UTC)
                tr = await repository.write_connection_test_result(
                    session,
                    tenant_id=seeded.tenant_id,
                    connection_id=conn.id,
                    attempted_by_membership_id=seeded.actor_membership_id,
                    credential_version=1,
                    status=DbConnectionTestStatus.failure,
                    failure_category=None,
                    sanitized_error="see snowflake://acct/db for detail",
                    started_at=now,
                    completed_at=now,
                )
                assert "snowflake://<redacted>" in (tr.sanitized_error or "")
                assert "snowflake://acct" not in (tr.sanitized_error or "")
        finally:
            await _dispose_after_test()

    asyncio.run(run())


def test_write_management_audit_redacts_sanitized_message(
    use_live_postgres: None,
) -> None:
    async def run() -> None:
        try:
            seeded = await seed_workspace_with_actor(actor_role=MembershipRole.admin)
            maker = get_async_session_maker()
            async with maker() as session:
                conn = await repository.create_connection(
                    session,
                    tenant_id=seeded.tenant_id,
                    name="d",
                    warehouse="wh",
                    database="db",
                    schema=None,
                    created_by_membership_id=seeded.actor_membership_id,
                )
                await session.flush()
                ar = await repository.write_management_audit(
                    session,
                    tenant_id=seeded.tenant_id,
                    connection_id=conn.id,
                    actor_membership_id=seeded.actor_membership_id,
                    action=DbAuditAction.test,
                    outcome=DbAuditOutcome.failure,
                    sanitized_message="vault_secret_id=leaked-uuid-here",
                )
                assert ar.sanitized_message is not None
                assert "leaked-uuid-here" not in ar.sanitized_message
                assert "<redacted>" in ar.sanitized_message
        finally:
            await _dispose_after_test()

    asyncio.run(run())


def test_promote_pending_secret_requires_pending_version(
    use_live_postgres: None,
) -> None:
    async def run() -> None:
        try:
            seeded = await seed_workspace_with_actor(actor_role=MembershipRole.admin)
            maker = get_async_session_maker()
            async with maker() as session:
                conn = await repository.create_connection(
                    session,
                    tenant_id=seeded.tenant_id,
                    name="e",
                    warehouse="wh",
                    database="db",
                    schema=None,
                    created_by_membership_id=seeded.actor_membership_id,
                )
                conn.pending_vault_secret_id = "vault-partial"
                conn.pending_secret_version = None
                await session.flush()
                with pytest.raises(ConnectionValidationError):
                    await repository.promote_pending_secret(
                        session,
                        tenant_id=seeded.tenant_id,
                        connection_id=conn.id,
                        updated_by_membership_id=seeded.actor_membership_id,
                    )
        finally:
            await _dispose_after_test()

    asyncio.run(run())
