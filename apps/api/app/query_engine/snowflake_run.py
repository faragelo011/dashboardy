"""Snowflake read execution for validated SQL + bound dict parameters only."""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from datetime import date, datetime
from datetime import time as dt_time
from decimal import Decimal
from typing import TYPE_CHECKING, Any
from uuid import UUID

from app.connections.snowflake import (
    categorize_snowflake_failure,
    private_key_der_pkcs8_from_pem,
)
from app.models.data_connections import DataConnection
from app.query_engine.enums import ExecutionStatus

if TYPE_CHECKING:
    from app.config import Settings


@dataclass(frozen=True, slots=True)
class SnowflakeSelectOutcome:
    """Structured Snowflake SELECT outcome for HTTP 200 payloads."""

    column_names: list[str]
    column_types: list[str | None]
    rows: list[list[Any]]
    status: ExecutionStatus
    truncated: bool
    snowflake_wall_ms: int
    bytes_scanned: int | None
    message: str | None


def _json_cell(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float, str)):
        return value
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, (datetime, date, dt_time)):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return str(value)


def _elapsed_ms(started: float) -> int:
    return max(0, int((time.perf_counter() - started) * 1000))


def _blocked_outcome(
    *,
    began: float,
    status: ExecutionStatus,
    message: str,
    columns: list[str] | None = None,
) -> SnowflakeSelectOutcome:
    names = columns or []
    return SnowflakeSelectOutcome(
        column_names=names,
        column_types=[None] * len(names),
        rows=[],
        status=status,
        truncated=False,
        snowflake_wall_ms=_elapsed_ms(began),
        bytes_scanned=None,
        message=message[:4_096],
    )


def _blocking_execute_select(
    *,
    connection_row: DataConnection,
    secret: dict[str, str],
    sql_text: str,
    bindings: dict[str, Any],
    default_max_rows: int,
    hard_max_rows: int,
    statement_timeout_seconds: int,
) -> SnowflakeSelectOutcome:
    began = time.perf_counter()

    try:
        import snowflake.connector  # noqa: PLC0415
    except ImportError as exc:
        return _blocked_outcome(
            began=began,
            status=ExecutionStatus.warehouse_error,
            message=f"Snowflake connector unavailable ({exc}).",
        )

    account = secret.get("account", "").strip()
    username = secret.get("username", "").strip()
    password = secret.get("password", "") or ""
    if not isinstance(password, str):
        password = str(password)
    role = secret.get("role", "").strip()
    pk_pem = secret.get("private_key_pem", "").strip()
    pk_pp_raw = secret.get("private_key_passphrase")
    pk_pp = str(pk_pp_raw) if pk_pp_raw else None
    passphrase = pk_pp.strip() if pk_pp and pk_pp.strip() else None

    common_kw: dict[str, Any] = dict(
        account=account,
        user=username,
        warehouse=connection_row.warehouse,
        database=connection_row.database,
        schema=connection_row.schema_,
        role=role,
        login_timeout=min(15, statement_timeout_seconds),
        network_timeout=statement_timeout_seconds,
        ocsp_fail_open=True,
        session_parameters={
            "STATEMENT_TIMEOUT_IN_SECONDS": statement_timeout_seconds,
        },
    )

    conn = None
    cursor = None

    try:
        if pk_pem:
            try:
                key_bytes = private_key_der_pkcs8_from_pem(
                    pem=pk_pem,
                    passphrase=passphrase,
                )
            except ValueError as exc:
                return _blocked_outcome(
                    began=began,
                    status=ExecutionStatus.warehouse_error,
                    message=str(exc),
                )
            conn = snowflake.connector.connect(private_key=key_bytes, **common_kw)
        else:
            conn = snowflake.connector.connect(password=password, **common_kw)

        cursor = conn.cursor()
        cursor.execute(sql_text, bindings)

        columns = [d[0] for d in (cursor.description or ())]
        col_types = [None for _ in columns]

        fetched: list[list[Any]] = []
        over_hard = False
        while True:
            batch = cursor.fetchmany(768)
            if not batch:
                break
            for row in batch:
                fetched.append([_json_cell(cell) for cell in row])

                if len(fetched) == hard_max_rows + 1:
                    over_hard = True
                    break
            if over_hard:
                break
        if over_hard:
            rows_out = fetched[:hard_max_rows]
            status = ExecutionStatus.row_limit_exceeded
            truncated = True
        elif len(fetched) > default_max_rows:
            rows_out = fetched[:default_max_rows]
            status = ExecutionStatus.ok
            truncated = True
        else:
            rows_out = fetched
            status = ExecutionStatus.ok
            truncated = False

        return SnowflakeSelectOutcome(
            column_names=columns,
            column_types=col_types,
            rows=rows_out,
            status=status,
            truncated=truncated,
            snowflake_wall_ms=_elapsed_ms(began),
            bytes_scanned=None,
            message=None,
        )
    except Exception as exc:  # noqa: BLE001 — map driver failures to statuses
        category = categorize_snowflake_failure(exc)
        cls_name = exc.__class__.__name__
        is_timeoutish = cls_name in ("OperationalError", "TimeoutError")
        stat = ExecutionStatus.timeout if (
            is_timeoutish or category.value == "timeout"
        ) else ExecutionStatus.warehouse_error

        cols: list[str] = []
        if cursor is not None and cursor.description:
            cols = [d[0] for d in cursor.description]

        return _blocked_outcome(
            began=began,
            status=stat,
            message=str(exc) or cls_name,
            columns=cols,
        )
    finally:
        if cursor is not None:
            try:
                cursor.close()
            except Exception:  # noqa: BLE001
                pass
        if conn is not None:
            try:
                conn.close()
            except Exception:  # noqa: BLE001
                pass


async def execute_snowflake_select(
    *,
    connection_row: DataConnection,
    secret: dict[str, str],
    sql_text: str,
    bindings: dict[str, Any],
    settings: Settings,
) -> SnowflakeSelectOutcome:
    return await asyncio.to_thread(
        _blocking_execute_select,
        connection_row=connection_row,
        secret=secret,
        sql_text=sql_text,
        bindings=bindings,
        default_max_rows=settings.QUERY_ENGINE_DEFAULT_MAX_ROWS,
        hard_max_rows=settings.QUERY_ENGINE_HARD_MAX_ROWS,
        statement_timeout_seconds=settings.QUERY_ENGINE_SNOWFLAKE_STATEMENT_TIMEOUT_SECONDS,
    )
