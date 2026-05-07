"""Snowflake connectivity test boundary (bounded connectivity only)."""

from __future__ import annotations

import asyncio
from typing import Protocol, runtime_checkable

from app.connections.enums import FailureCategory
from app.connections.errors import DependencyUnavailableError


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
        try:
            import snowflake.connector  # type: ignore[import-not-found]
        except Exception as exc:  # pragma: no cover
            raise DependencyUnavailableError("Snowflake connector unavailable") from exc

        def _connect_and_close() -> None:
            conn = snowflake.connector.connect(
                account=account,
                user=user,
                password=password,
                warehouse=warehouse,
                database=database,
                schema=schema,
                role=role,
                login_timeout=10,
                network_timeout=10,
                ocsp_fail_open=True,
            )
            try:
                cur = conn.cursor()
                try:
                    cur.execute("SELECT 1")
                    cur.fetchone()
                finally:
                    cur.close()
            finally:
                conn.close()

        # Run in a thread to avoid blocking the event loop.
        await asyncio.to_thread(_connect_and_close)


def categorize_snowflake_failure(exc: BaseException) -> FailureCategory:
    msg = str(exc).lower()
    if any(token in msg for token in ("timeout", "timed out", "time out")):
        return FailureCategory.timeout
    if any(
        token in msg
        for token in (
            "network",
            "failed to connect",
            "connection refused",
            "name or service not known",
        )
    ):
        return FailureCategory.network
    if any(
        token in msg
        for token in (
            "not authorized",
            "insufficient privilege",
            "permission",
            "access denied",
        )
    ):
        return FailureCategory.permission
    if any(
        token in msg
        for token in ("incorrect", "invalid", "authentication", "login", "password")
    ):
        return FailureCategory.credential
    return FailureCategory.unknown
