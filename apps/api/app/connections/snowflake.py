"""Snowflake connectivity test boundary (bounded connectivity only)."""

from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class SnowflakeTester(Protocol):
    async def run_connectivity_check(
        self,
        *,
        account: str,
        user: str,
        password: str,
        warehouse: str,
        database: str,
        schema: str | None,
        role: str,
    ) -> None:
        """Raise on failure; return None on success."""


class SnowflakeConnectorTester:
    """Default tester wired to `snowflake-connector-python` in later story tasks."""

    async def run_connectivity_check(
        self,
        *,
        account: str,
        user: str,
        password: str,
        warehouse: str,
        database: str,
        schema: str | None,
        role: str,
    ) -> None:
        _ = account, user, password, warehouse, database, schema, role
        raise NotImplementedError("Snowflake connectivity check is implemented in US2")
