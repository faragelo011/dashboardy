"""Golden SQL regression tests (Feature 004 / SC-001 baseline)."""

from __future__ import annotations

import builtins
from pathlib import Path

import pytest
from app.query_engine.parameter_binding import (
    ParameterBindingError,
    prepare_adhoc_sql_hashes,
)
from app.query_engine.parser import QueryParserError, parse_and_validate

_SQL_ROOT = Path(__file__).resolve().parents[2] / "fixtures" / "query_sql"


def _iter_sql(kind: str) -> list[Path]:
    directory = _SQL_ROOT / kind
    if not directory.exists():
        return []
    return sorted(path for path in directory.glob("*.sql") if path.is_file())


@pytest.mark.parametrize("fixture_path", _iter_sql("allowed"))
def test_parser_golden_allowed(fixture_path: Path) -> None:
    text = fixture_path.read_text(encoding="utf-8")
    parse_and_validate(text)


@pytest.mark.parametrize("fixture_path", _iter_sql("denied"))
def test_parser_golden_denied(fixture_path: Path) -> None:
    text = fixture_path.read_text(encoding="utf-8")
    with pytest.raises(QueryParserError):
        parse_and_validate(text)


@pytest.mark.parametrize("fixture_path", _iter_sql("allowed"))
def test_prepare_adhoc_no_snowflake_import(
    monkeypatch: pytest.MonkeyPatch,
    fixture_path: Path,
) -> None:
    invoked: list[str] = []
    original = builtins.__import__

    def guarding_import(
        name: str,
        globals_arg: dict | None = None,  # noqa: ARG001
        locals_arg: dict | None = None,  # noqa: ARG001
        fromlist: tuple[str, ...] = (),
        level: int = 0,  # noqa: ARG001
    ):
        invoked.append(name)
        if name == "snowflake" or name.startswith("snowflake."):
            pytest.fail(f"Imported Snowflake unexpectedly: {name}")
        return original(name, globals_arg, locals_arg, fromlist, level)

    monkeypatch.setattr(builtins, "__import__", guarding_import)
    text = fixture_path.read_text(encoding="utf-8")
    if "%(" not in text:
        parse_and_validate(text)
    prepare_adhoc_sql_hashes(text, parameters={})
    snowflake_related = [
        mod for mod in invoked if mod == "snowflake" or mod.startswith("snowflake.")
    ]
    assert not snowflake_related


def test_parameter_binding_mismatch() -> None:
    with pytest.raises(ParameterBindingError):
        prepare_adhoc_sql_hashes(
            "SELECT 1 WHERE %(missing)s IS NULL",
            parameters={},
        )
