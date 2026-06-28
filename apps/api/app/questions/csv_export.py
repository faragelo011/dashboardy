"""CSV export rendering helpers (Feature 005)."""

from __future__ import annotations

import csv
import io
from typing import Any

from app.query_engine.schemas import ColumnDescriptor

MAX_CSV_DATA_ROWS = 10_000


def _format_csv_field(value: Any) -> str:
    if value is None:
        return ""
    buffer = io.StringIO()
    csv.writer(buffer, lineterminator="").writerow([value])
    return buffer.getvalue()


def render_query_result_csv(
    *,
    columns: list[ColumnDescriptor],
    rows: list[list[Any]],
) -> str:
    """Render governed query columns/rows as RFC 4180-compatible CSV."""
    lines = [",".join(_format_csv_field(column.name) for column in columns)]
    for row in rows[:MAX_CSV_DATA_ROWS]:
        lines.append(",".join(_format_csv_field(value) for value in row))
    return "\n".join(lines) + "\n"
