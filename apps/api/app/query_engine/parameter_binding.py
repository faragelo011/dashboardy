"""Pyformat ``%(name)s`` bindings for Snowflake.

sqlglot cannot parse naked ``%(name)s`` in SQL strings; callers run **mask → parse →
canonicalize → unmask** via marker ``__DASHBOARDY_PYBIND_``.
"""

from __future__ import annotations

import re
from typing import Any

from app.query_engine.hashing import (
    bound_parameters_projection_hash,
    canonical_sql_sha256,
)
from app.query_engine.parser import parse_and_validate

_PYFORMAT = re.compile(r'%\(([A-Za-z][A-Za-z0-9_]*)\)s')

_BIND_MARKER = "__DASHBOARDY_PYBIND_"


class ParameterBindingError(Exception):
    """Pre-warehouse rejection for placeholder / caller parameter mismatch."""

    def __init__(
        self, message: str, *, error_code: str = "parameter_binding_failed"
    ) -> None:
        super().__init__(message)
        self.error_code = error_code


def _reject_bind_collision(sql_text: str) -> None:
    if _BIND_MARKER in sql_text:
        raise ParameterBindingError(
            "SQL must not embed reserved binder marker text.",
            error_code="parameter_binding_failed",
        )


def mask_pyformat_bindings(sql_text: str) -> str:
    def repl(match: re.Match[str]) -> str:
        name = match.group(1)
        return f'"{_BIND_MARKER}{name}__"'

    return _PYFORMAT.sub(repl, sql_text)


_UNMASK_BINDING = re.compile(
    '"' + re.escape(_BIND_MARKER) + r"(?P<name>[A-Za-z][A-Za-z0-9_]*)__" + '"'
)


def unmask_pyformat_bindings(canonical_masked: str) -> str:
    return _UNMASK_BINDING.sub(lambda m: f'%({m.group("name")})s', canonical_masked)


def _required_binding_names(exec_sql: str) -> set[str]:
    return set(_PYFORMAT.findall(exec_sql))


def verify_parameters_cover_placeholders_sql(
    exec_sql: str, parameters: dict[str, Any]
) -> None:
    required = _required_binding_names(exec_sql)
    provided = set(parameters.keys())
    if required != provided:
        raise ParameterBindingError(
            "Parameter bindings must exactly match placeholders in canonical SQL.",
            error_code="parameter_binding_failed",
        )


def prepare_adhoc_sql_hashes(
    sql_text: str,
    *,
    parameters: dict[str, Any],
) -> tuple[str, str, str]:
    """Validate ad hoc sql + produce warehouse SQL + hashing inputs.

    Returns ``(snowflake_executable_sql, sql_hash_hex, bound_parameters_hash_hex)``
    """

    trimmed = sql_text.strip()
    _reject_bind_collision(trimmed)
    masked = mask_pyformat_bindings(trimmed)
    canonical_masked = parse_and_validate(masked).canonical_text
    exec_sql = unmask_pyformat_bindings(canonical_masked)
    verify_parameters_cover_placeholders_sql(exec_sql, parameters)

    sql_hash = canonical_sql_sha256(exec_sql)
    param_hash = bound_parameters_projection_hash(parameters)
    return exec_sql, sql_hash, param_hash
