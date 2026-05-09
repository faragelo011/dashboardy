"""TTL seconds per presentation class (locked defaults in ``app.config`` / tasks.md)."""

from __future__ import annotations

from app.config import Settings, get_settings
from app.query_engine.enums import PresentationClass

# Feature 6: per-widget TTL from dashboard JSON: clamp **down** only via settings
# and user-supplied caps (never extend policy defaults here).


def presentation_class_ttl_seconds(
    pc: PresentationClass,
    *,
    settings: Settings | None = None,
) -> int:
    """TTL for the presentation class (≤ global ceiling in Settings)."""

    s = settings or get_settings()
    if pc == PresentationClass.kpi:
        raw = s.QUERY_ENGINE_CACHE_TTL_KPI_SECONDS
    elif pc == PresentationClass.chart:
        raw = s.QUERY_ENGINE_CACHE_TTL_CHART_SECONDS
    elif pc == PresentationClass.table:
        raw = s.QUERY_ENGINE_CACHE_TTL_TABLE_SECONDS
    else:
        raise ValueError(f"Unknown PresentationClass: {pc}")
    return min(raw, s.QUERY_ENGINE_CACHE_GLOBAL_TTL_CEILING_SECONDS)
