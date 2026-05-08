from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from app.connections.resolver import ConnectionResolver


@pytest.mark.asyncio
async def test_resolver_cache_invalidation_by_secret_version():
    tenant_id = uuid4()
    connection_id = uuid4()

    now = datetime(2026, 1, 1, tzinfo=UTC)
    def clock() -> datetime:
        return now

    # Fake session + fake repository getter via monkeypatch
    session = SimpleNamespace()

    calls: list[int] = []
    state = {"version": 1}

    async def fake_get_connection_for_tenant(_session, *, tenant_id):
        calls.append(1)
        return SimpleNamespace(
            tenant_id=tenant_id,
            id=connection_id,
            vault_secret_id="vault-1",
            secret_version=state["version"],
            warehouse="WH",
            database="DB",
            schema_=None,
        )

    import app.connections.repository as repo

    orig = repo.get_connection_for_tenant
    repo.get_connection_for_tenant = fake_get_connection_for_tenant  # type: ignore[assignment]
    try:
        resolver = ConnectionResolver(clock=clock, max_staleness=timedelta(seconds=60))

        r1 = await resolver.resolve(session, tenant_id=tenant_id)
        assert r1 is not None
        assert r1.secret_version == 1

        # Within TTL and same version: should return cached.
        now = now + timedelta(seconds=10)
        r2 = await resolver.resolve(session, tenant_id=tenant_id)
        assert r2 is not None
        assert r2.secret_version == 1

        # Version bump within TTL: should refresh and reflect new version.
        state["version"] = 2
        now = now + timedelta(seconds=10)
        r3 = await resolver.resolve(session, tenant_id=tenant_id)
        assert r3 is not None
        assert r3.secret_version == 2
    finally:
        repo.get_connection_for_tenant = orig  # type: ignore[assignment]

