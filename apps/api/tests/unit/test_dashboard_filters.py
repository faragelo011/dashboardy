"""Unit tests for dashboard filter merge and cache hash helpers."""

from __future__ import annotations

from app.dashboards.filters import compute_filter_state_hash
from app.dashboards.schemas import (
    GlobalFilter,
    GlobalFilterValueType,
    clamp_widget_ttl_seconds,
)
from app.query_engine.enums import PresentationClass


def test_compute_filter_state_hash_ignores_unbound_global_filters() -> None:
    global_filters = [
        GlobalFilter(
            id="gf_a",
            label="A",
            value_type=GlobalFilterValueType.string,
            default_value="a",
        ),
        GlobalFilter(
            id="gf_b",
            label="B",
            value_type=GlobalFilterValueType.string,
            default_value="b",
        ),
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
