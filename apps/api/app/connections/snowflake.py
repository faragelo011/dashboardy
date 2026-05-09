"""Snowflake connectivity test boundary (bounded connectivity only)."""

from __future__ import annotations

import asyncio
from typing import Protocol, runtime_checkable

from cryptography.hazmat.primitives import serialization

from app.connections.enums import FailureCategory
from app.connections.errors import DependencyUnavailableError


def private_key_der_pkcs8_from_pem(*, pem: str, passphrase: str | None) -> bytes:
    """Load a PEM PKCS#8/RSA private key and return PKCS8 DER bytes for Snowflake."""
    key = serialization.load_pem_private_key(
        pem.encode("utf-8"),
        password=passphrase.encode("utf-8") if passphrase else None,
    )
    return key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )


@runtime_checkable
class SnowflakeTester(Protocol):
    async def run_connectivity_check(
        self,
        *,
        account: str,
        user: str,
        password: str | None,
        private_key_pem: str | None,
        private_key_passphrase: str | None,
        warehouse: str,
        database: str,
        schema: str | None,
        role: str,
    ) -> None:
        """Raise on failure; return None on success."""


class SnowflakeConnectorTester:
    """Default tester wired to `snowflake-connector-python`."""

    async def run_connectivity_check(
        self,
        *,
        account: str,
        user: str,
        password: str | None,
        private_key_pem: str | None,
        private_key_passphrase: str | None,
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
            common = dict(
                account=account,
                user=user,
                warehouse=warehouse,
                database=database,
                schema=schema,
                role=role,
                login_timeout=10,
                network_timeout=10,
                ocsp_fail_open=True,
            )
            if private_key_pem and private_key_pem.strip():
                try:
                    pkb = private_key_der_pkcs8_from_pem(
                        pem=private_key_pem.strip(),
                        passphrase=None
                        if not private_key_passphrase or not private_key_passphrase.strip()
                        else private_key_passphrase,
                    )
                except ValueError as exc:
                    raise DependencyUnavailableError(
                        "Snowflake private key is invalid or passphrase is wrong"
                    ) from exc
                conn = snowflake.connector.connect(private_key=pkb, **common)  # type: ignore[arg-type]
            elif password is not None and password != "":
                conn = snowflake.connector.connect(password=password, **common)  # type: ignore[arg-type]
            else:
                raise DependencyUnavailableError(
                    "Snowflake credentials must include password or private_key_pem"
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
