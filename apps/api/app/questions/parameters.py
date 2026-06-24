"""Scalar parameter schema + runtime validation (Feature 005)."""

from __future__ import annotations

import re
from datetime import date
from typing import Any

from app.questions.schemas import ParameterDefinition, QuestionParameterType

_ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class ParameterValidationError(ValueError):
    """Raised when declared schema or runtime values are invalid."""

    def __init__(
        self,
        message: str,
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.details = details


def validate_parameter_schema(declarations: list[ParameterDefinition]) -> None:
    """Reject duplicate names, blank names, unsupported types, and bad defaults."""

    seen: set[str] = set()
    for decl in declarations:
        name = decl.name.strip()
        if not name:
            raise ParameterValidationError("Parameter name must not be blank.")
        if name in seen:
            raise ParameterValidationError(
                f"Duplicate parameter name: {name!r}.",
                details={"name": name},
            )
        seen.add(name)
        if decl.type not in QuestionParameterType:
            raise ParameterValidationError(
                f"Unsupported parameter type for {name!r}.",
                details={"name": name, "type": str(decl.type)},
            )
        if decl.default is not None:
            _coerce_runtime_value(decl, decl.default)


def _coerce_string(value: Any, *, name: str) -> str:
    if isinstance(value, str):
        return value
    raise ParameterValidationError(
        f"Parameter {name!r} must be a string.",
        details={"name": name, "type": "string"},
    )


def _coerce_number(value: Any, *, name: str) -> int | float:
    if isinstance(value, bool):
        raise ParameterValidationError(
            f"Parameter {name!r} must be a number.",
            details={"name": name, "type": "number"},
        )
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            raise ParameterValidationError(
                f"Parameter {name!r} must be a number.",
                details={"name": name, "type": "number"},
            )
        try:
            if "." in text or "e" in text.lower():
                return float(text)
            return int(text)
        except ValueError as exc:
            raise ParameterValidationError(
                f"Parameter {name!r} must be a number.",
                details={"name": name, "type": "number"},
            ) from exc
    raise ParameterValidationError(
        f"Parameter {name!r} must be a number.",
        details={"name": name, "type": "number"},
    )


def _coerce_boolean(value: Any, *, name: str) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes"}:
            return True
        if lowered in {"false", "0", "no"}:
            return False
    raise ParameterValidationError(
        f"Parameter {name!r} must be a boolean.",
        details={"name": name, "type": "boolean"},
    )


def _coerce_date(value: Any, *, name: str) -> str:
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str):
        text = value.strip()
        if _ISO_DATE.match(text):
            try:
                date.fromisoformat(text)
            except ValueError as exc:
                raise ParameterValidationError(
                    f"Parameter {name!r} must be an ISO date (YYYY-MM-DD).",
                    details={"name": name, "type": "date"},
                ) from exc
            return text
    raise ParameterValidationError(
        f"Parameter {name!r} must be an ISO date (YYYY-MM-DD).",
        details={"name": name, "type": "date"},
    )


def _coerce_runtime_value(
    decl: ParameterDefinition,
    value: Any,
) -> str | int | float | bool:
    if decl.type == QuestionParameterType.string:
        return _coerce_string(value, name=decl.name)
    if decl.type == QuestionParameterType.number:
        return _coerce_number(value, name=decl.name)
    if decl.type == QuestionParameterType.boolean:
        return _coerce_boolean(value, name=decl.name)
    return _coerce_date(value, name=decl.name)


def validate_runtime_parameters(
    declarations: list[ParameterDefinition],
    runtime: dict[str, Any] | None,
) -> dict[str, str | int | float | bool]:
    """Coerce or reject runtime values against a declared scalar schema."""

    validate_parameter_schema(declarations)
    values = dict(runtime or {})
    declared_names = {decl.name.strip() for decl in declarations}

    unknown = sorted(set(values.keys()) - declared_names)
    if unknown:
        raise ParameterValidationError(
            "Unknown runtime parameter(s).",
            details={"unknown_parameters": unknown},
        )

    coerced: dict[str, str | int | float | bool] = {}
    for decl in declarations:
        name = decl.name.strip()
        if name in values:
            coerced[name] = _coerce_runtime_value(decl, values[name])
            continue
        if decl.required:
            if decl.default is not None:
                coerced[name] = _coerce_runtime_value(decl, decl.default)
                continue
            raise ParameterValidationError(
                f"Missing required parameter {name!r}.",
                details={"name": name},
            )
        if decl.default is not None:
            coerced[name] = _coerce_runtime_value(decl, decl.default)
    return coerced
