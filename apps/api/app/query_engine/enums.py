"""Wire enums aligned to OpenAPI schemas in specs/004-query-engine/contracts."""

from __future__ import annotations

from enum import StrEnum


class ExecutionStatus(StrEnum):
    ok = "ok"
    timeout = "timeout"
    row_limit_exceeded = "row_limit_exceeded"
    rejected_by_parser = "rejected_by_parser"
    warehouse_error = "warehouse_error"
    authz_denied = "authz_denied"
    warehouse_busy = "warehouse_busy"


class QueryMode(StrEnum):
    adhoc = "adhoc"
    saved_question = "saved_question"
    widget = "widget"


class PresentationClass(StrEnum):
    kpi = "kpi"
    chart = "chart"
    table = "table"
