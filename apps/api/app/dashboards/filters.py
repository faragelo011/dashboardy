"""Global filter merge and filter_state_hash helpers (Feature 006)."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from app.dashboards.schemas import GlobalFilter


class FilterValidationError(ValueError):
    """Raised when dashboard filter bindings or overrides are invalid."""

    def __init__(self, error_code: str, message: str) -> None:
        super().__init__(message)
        self.error_code = error_code
        self.message = message


def _global_filter_ids(global_filters: list[GlobalFilter]) -> set[str]:
    return {item.id for item in global_filters}


def validate_global_filters(global_filters: list[GlobalFilter]) -> None:
    """Reject duplicate ids and blank labels."""

    seen: set[str] = set()
    for item in global_filters:
        if not item.label.strip():
            raise FilterValidationError(
                "invalid_parameters",
                "Global filter label must not be blank.",
            )
        if not item.id.strip():
            raise FilterValidationError(
                "invalid_parameters",
                "Global filter id must not be blank.",
            )
        if item.id in seen:
            raise FilterValidationError(
                "invalid_parameters",
                f"Duplicate global filter id: {item.id!r}.",
            )
        seen.add(item.id)


def validate_global_filter_values(
    *,
    global_filters: list[GlobalFilter],
    global_filter_values: dict[str, Any],
) -> None:
    """Reject runtime values that reference undeclared global filters."""

    known = _global_filter_ids(global_filters)
    unknown = set(global_filter_values) - known
    if unknown:
        raise FilterValidationError(
            "invalid_filter_bindings",
            f"Unknown global filter value ids: {sorted(unknown)}",
        )


def validate_bindings_reference_global_filters(
    *,
    global_filters: list[GlobalFilter],
    filter_bindings: dict[str, str],
    filter_overrides: dict[str, Any] | None = None,
) -> None:
    """Reject unknown global filter ids and widget-local-only filter keys."""

    known = _global_filter_ids(global_filters)
    unknown_bindings = set(filter_bindings) - known
    if unknown_bindings:
        raise FilterValidationError(
            "invalid_filter_bindings",
            f"Unknown global filter binding ids: {sorted(unknown_bindings)}",
        )

    overrides = filter_overrides or {}
    unknown_overrides = set(overrides) - known
    if unknown_overrides:
        raise FilterValidationError(
            "widget_local_filter_forbidden",
            "Filter overrides must reference declared global filters: "
            f"{sorted(unknown_overrides)}",
        )


def resolve_global_filter_value(
    global_filters: list[GlobalFilter],
    global_filter_values: dict[str, Any],
    global_filter_id: str,
) -> Any:
    """Runtime value when present, otherwise the declared default."""

    if global_filter_id in global_filter_values:
        return global_filter_values[global_filter_id]
    for item in global_filters:
        if item.id == global_filter_id:
            return item.default_value
    return None


def widget_has_active_overrides(
    *,
    global_filters: list[GlobalFilter],
    filter_overrides: dict[str, Any],
    global_filter_values: dict[str, Any] | None = None,
) -> bool:
    """True when any override differs from the effective global filter value."""

    if not filter_overrides:
        return False
    values = global_filter_values or {}
    for global_filter_id, override_value in filter_overrides.items():
        global_value = resolve_global_filter_value(
            global_filters,
            values,
            global_filter_id,
        )
        if _canonicalize(override_value) != _canonicalize(global_value):
            return True
    return False


def merge_widget_parameters(
    global_filters: list[GlobalFilter],
    global_filter_values: dict[str, Any],
    widget_bindings: dict[str, str],
    filter_overrides: dict[str, Any],
) -> dict[str, Any]:
    """Merge dashboard-global values and per-widget overrides into parameter names."""

    validate_bindings_reference_global_filters(
        global_filters=global_filters,
        filter_bindings=widget_bindings,
        filter_overrides=filter_overrides,
    )

    defaults = {item.id: item.default_value for item in global_filters}
    merged: dict[str, Any] = {}
    for global_filter_id, parameter_name in widget_bindings.items():
        if global_filter_id in filter_overrides:
            value = filter_overrides[global_filter_id]
        elif global_filter_id in global_filter_values:
            value = global_filter_values[global_filter_id]
        else:
            value = defaults.get(global_filter_id)
        merged[parameter_name] = value
    return merged


def compute_filter_state_hash(
    *,
    global_filters: list[GlobalFilter],
    global_filter_values: dict[str, Any],
    widget_bindings: dict[str, str],
    filter_overrides: dict[str, Any],
) -> str:
    """Stable hash for widget cache identity when bound filter state changes."""

    bound_filter_ids = set(widget_bindings) | set(filter_overrides)
    defaults = {
        item.id: item.default_value
        for item in global_filters
        if item.id in bound_filter_ids
    }
    scoped_values = {
        key: value
        for key, value in global_filter_values.items()
        if key in bound_filter_ids
    }

    payload = {
        "global_filter_values": _canonicalize(scoped_values),
        "widget_bindings": _canonicalize(widget_bindings),
        "filter_overrides": _canonicalize(filter_overrides),
        "global_filter_defaults": _canonicalize(defaults),
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _canonicalize(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            str(k): _canonicalize(v)
            for k, v in sorted(value.items(), key=lambda item: str(item[0]))
        }
    if isinstance(value, list):
        return [_canonicalize(item) for item in value]
    return value
