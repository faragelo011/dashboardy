"""Unit tests for dashboard filter merge and cache hash helpers."""

from __future__ import annotations

import pytest
from app.dashboards.filters import (
    FilterValidationError,
    compute_filter_state_hash,
    merge_widget_parameters,
    validate_global_filter_values,
    validate_global_filters,
    widget_has_active_overrides,
)
from app.dashboards.schemas import (
    GlobalFilter,
    GlobalFilterValueType,
    clamp_widget_ttl_seconds,
)
from app.query_engine.enums import PresentationClass


def _gf(
    gf_id: str,
    *,
    default: str = "default",
) -> GlobalFilter:
    return GlobalFilter(
        id=gf_id,
        label=gf_id.upper(),
        value_type=GlobalFilterValueType.string,
        default_value=default,
    )


def test_merge_widget_parameters_uses_bindings_and_runtime_values() -> None:
    global_filters = [_gf("gf_region", default="EMEA")]
    merged = merge_widget_parameters(
        global_filters,
        {"gf_region": "NA"},
        {"gf_region": "region"},
        {},
    )
    assert merged == {"region": "NA"}


def test_merge_widget_parameters_falls_back_to_default_when_value_missing() -> None:
    global_filters = [_gf("gf_region", default="EMEA")]
    merged = merge_widget_parameters(
        global_filters,
        {},
        {"gf_region": "region"},
        {},
    )
    assert merged == {"region": "EMEA"}


def test_merge_widget_parameters_ignores_unbound_global_filters() -> None:
    global_filters = [
        _gf("gf_a", default="a"),
        _gf("gf_b", default="b"),
    ]
    merged = merge_widget_parameters(
        global_filters,
        {"gf_a": "x", "gf_b": "ignored"},
        {"gf_a": "param_a"},
        {},
    )
    assert merged == {"param_a": "x"}


def test_merge_widget_parameters_override_precedence() -> None:
    """Override beats global runtime value for the same global_filter_id."""

    global_filters = [_gf("gf_date", default="2024-01-01")]
    merged = merge_widget_parameters(
        global_filters,
        {"gf_date": "2024-06-01"},
        {"gf_date": "as_of_date"},
        {"gf_date": "2024-03-01"},
    )
    assert merged == {"as_of_date": "2024-03-01"}


def test_compute_filter_state_hash_changes_when_override_changes() -> None:
    global_filters = [_gf("gf_date", default="2024-01-01")]
    bindings = {"gf_date": "as_of_date"}
    common = dict(
        global_filters=global_filters,
        widget_bindings=bindings,
        global_filter_values={"gf_date": "2024-06-01"},
    )

    hash_a = compute_filter_state_hash(
        **common,
        filter_overrides={"gf_date": "2024-03-01"},
    )
    hash_b = compute_filter_state_hash(
        **common,
        filter_overrides={"gf_date": "2024-04-01"},
    )
    assert hash_a != hash_b


def test_widget_has_active_overrides_true_when_override_differs_from_default() -> None:
    global_filters = [_gf("gf_date", default="2024-01-01")]
    assert widget_has_active_overrides(
        global_filters=global_filters,
        filter_overrides={"gf_date": "2024-03-01"},
    )


def test_widget_has_active_overrides_false_when_override_matches_default() -> None:
    global_filters = [_gf("gf_date", default="2024-01-01")]
    assert not widget_has_active_overrides(
        global_filters=global_filters,
        filter_overrides={"gf_date": "2024-01-01"},
    )


def test_widget_has_active_overrides_false_when_override_matches_runtime() -> None:
    global_filters = [_gf("gf_date", default="2024-01-01")]
    assert not widget_has_active_overrides(
        global_filters=global_filters,
        filter_overrides={"gf_date": "2024-06-01"},
        global_filter_values={"gf_date": "2024-06-01"},
    )


def test_compute_filter_state_hash_changes_when_bound_value_changes() -> None:
    global_filters = [_gf("gf_a"), _gf("gf_b")]
    bindings = {"gf_a": "param_a"}
    common = dict(
        global_filters=global_filters,
        widget_bindings=bindings,
        filter_overrides={},
    )

    hash_a = compute_filter_state_hash(
        **common,
        global_filter_values={"gf_a": "one"},
    )
    hash_b = compute_filter_state_hash(
        **common,
        global_filter_values={"gf_a": "two"},
    )
    assert hash_a != hash_b


def test_compute_filter_state_hash_ignores_unbound_global_filters() -> None:
    global_filters = [
        _gf("gf_a", default="a"),
        _gf("gf_b", default="b"),
    ]
    bindings = {"gf_a": "param_a"}
    common = dict(
        global_filters=global_filters,
        widget_bindings=bindings,
        filter_overrides={},
    )

    hash_a = compute_filter_state_hash(
        **common,
        global_filter_values={"gf_a": "x", "gf_b": "changed"},
    )
    hash_b = compute_filter_state_hash(
        **common,
        global_filter_values={"gf_a": "x", "gf_b": "other"},
    )
    assert hash_a == hash_b


def test_validate_global_filters_rejects_duplicate_ids() -> None:
    filters = [
        _gf("gf_a"),
        GlobalFilter(
            id="gf_a",
            label="Duplicate",
            value_type=GlobalFilterValueType.string,
            default_value="x",
        ),
    ]
    with pytest.raises(FilterValidationError) as exc:
        validate_global_filters(filters)
    assert exc.value.error_code == "invalid_parameters"


def test_validate_global_filters_rejects_blank_id() -> None:
    filters = [
        GlobalFilter(
            id="   ",
            label="Region",
            value_type=GlobalFilterValueType.string,
            default_value="x",
        ),
    ]
    with pytest.raises(FilterValidationError) as exc:
        validate_global_filters(filters)
    assert exc.value.error_code == "invalid_parameters"


def test_validate_global_filters_rejects_blank_label() -> None:
    filters = [
        GlobalFilter(
            id="gf_region",
            label="   ",
            value_type=GlobalFilterValueType.string,
            default_value="x",
        ),
    ]
    with pytest.raises(FilterValidationError) as exc:
        validate_global_filters(filters)
    assert exc.value.error_code == "invalid_parameters"


def test_validate_global_filter_values_rejects_unknown_id() -> None:
    with pytest.raises(FilterValidationError) as exc:
        validate_global_filter_values(
            global_filters=[_gf("gf_region")],
            global_filter_values={"gf_unknown": "x"},
        )
    assert exc.value.error_code == "invalid_filter_bindings"


def test_clamp_widget_ttl_rejects_bool() -> None:
    ceiling = clamp_widget_ttl_seconds({}, PresentationClass.chart)
    assert (
        clamp_widget_ttl_seconds({"ttl_seconds": True}, PresentationClass.chart)
        == ceiling
    )
    assert (
        clamp_widget_ttl_seconds({"ttl_seconds": False}, PresentationClass.chart)
        == ceiling
    )
