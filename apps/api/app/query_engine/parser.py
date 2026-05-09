"""Structural SQL validation (sqlglot Snowflake) + canonical text for ``sql_hash``.

Defense-in-depth per constitution §7.5; see ``specs/004-query-engine/research.md``.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlglot import exp, parse
from sqlglot.errors import ParseError

_READ_ONLY_ROOTS = (
    exp.Select,
    exp.Union,
    exp.Intersect,
    exp.Except,
    exp.With,
)

_FORBIDDEN_NODES: tuple[type[exp.Expression], ...] = (
    exp.Insert,
    exp.Update,
    exp.Delete,
    exp.Merge,
    exp.Create,
    exp.Drop,
    exp.Alter,
    exp.TruncateTable,
    exp.Transaction,
    exp.Commit,
    exp.Rollback,
    exp.Command,
    exp.Use,
    exp.Set,
    exp.Copy,
)


@dataclass(frozen=True, slots=True)
class CanonicalSql:
    """Validated statement plus normalized text used for ``canonical_sql_sha256``."""

    canonical_text: str


class QueryParserError(Exception):
    """Structural rejection before warehouse dispatch."""

    def __init__(self, message: str, *, error_code: str = "rejected_by_parser") -> None:
        super().__init__(message)
        self.error_code = error_code


def parse_and_validate(sql: str) -> CanonicalSql:
    trimmed = sql.strip()
    if not trimmed:
        raise QueryParserError("SQL text is empty")

    try:
        statements = parse(trimmed, dialect="snowflake")
    except ParseError as exc:
        raise QueryParserError(str(exc)) from exc

    if len(statements) != 1:
        raise QueryParserError("Exactly one SQL statement is required")

    root = statements[0]
    if not isinstance(root, _READ_ONLY_ROOTS):
        raise QueryParserError(
            "Only read-only SELECT stacks (SELECT, WITH, UNION, INTERSECT, EXCEPT)."
        )

    for forbidden in _FORBIDDEN_NODES:
        if root.find(forbidden):
            raise QueryParserError(f"Disallowed expression: {forbidden.__name__}")

    return CanonicalSql(canonical_text=canonicalize_for_hash(root))


def canonicalize_for_hash(tree: exp.Expression) -> str:
    return tree.sql(dialect="snowflake", normalize=True)
