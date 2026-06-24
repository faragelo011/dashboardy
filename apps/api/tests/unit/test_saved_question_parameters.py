"""Unit tests for saved-question parameter schema validation (US1)."""

from __future__ import annotations

import pytest
from app.questions.parameters import ParameterValidationError, validate_parameter_schema
from app.questions.schemas import ParameterDefinition, QuestionParameterType


def _decl(
    *,
    name: str = "region",
    type_: QuestionParameterType = QuestionParameterType.string,
    required: bool = True,
    label: str | None = None,
    default: str | int | float | bool | None = None,
) -> ParameterDefinition:
    return ParameterDefinition(
        name=name,
        type=type_,
        required=required,
        label=label,
        default=default,
    )


def test_accepts_scalar_types_with_defaults() -> None:
    validate_parameter_schema(
        [
            _decl(name="name", type_=QuestionParameterType.string, default="all"),
            _decl(name="limit", type_=QuestionParameterType.number, default=10),
            _decl(name="active", type_=QuestionParameterType.boolean, default=True),
            _decl(
                name="start",
                type_=QuestionParameterType.date,
                required=False,
                default="2024-01-15",
            ),
        ]
    )


def test_rejects_duplicate_names() -> None:
    with pytest.raises(ParameterValidationError, match="Duplicate"):
        validate_parameter_schema(
            [
                _decl(name="region"),
                _decl(name="region"),
            ]
        )


def test_rejects_blank_name() -> None:
    with pytest.raises(ParameterValidationError, match="whitespace"):
        validate_parameter_schema([_decl(name="   ")])


def test_rejects_whitespace_in_name() -> None:
    with pytest.raises(ParameterValidationError, match="whitespace"):
        validate_parameter_schema([_decl(name=" region")])


def test_rejects_invalid_default_for_type() -> None:
    with pytest.raises(ParameterValidationError, match="number"):
        validate_parameter_schema(
            [_decl(name="limit", type_=QuestionParameterType.number, default="nope")]
        )


def test_rejects_invalid_date_default_string() -> None:
    with pytest.raises(ParameterValidationError, match="ISO date"):
        validate_parameter_schema(
            [
                _decl(
                    name="start",
                    type_=QuestionParameterType.date,
                    default="2024-13-40",
                )
            ]
        )
