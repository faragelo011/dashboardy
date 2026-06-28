"""Unit tests for saved-question CSV rendering (US4)."""

from __future__ import annotations

from app.query_engine.schemas import ColumnDescriptor
from app.questions.csv_export import MAX_CSV_DATA_ROWS, render_query_result_csv


def test_render_csv_includes_headers_for_zero_rows() -> None:
    csv_text = render_query_result_csv(
        columns=[ColumnDescriptor(name="region"), ColumnDescriptor(name="amount")],
        rows=[],
    )
    assert csv_text == "region,amount\n"


def test_render_csv_escapes_commas_quotes_and_newlines() -> None:
    csv_text = render_query_result_csv(
        columns=[ColumnDescriptor(name="label")],
        rows=[['say "hello", world'], ["line\nbreak"]],
    )
    assert csv_text == 'label\n"say ""hello"", world"\n"line\nbreak"\n'


def test_render_csv_escapes_header_names() -> None:
    csv_text = render_query_result_csv(
        columns=[
            ColumnDescriptor(name="gross, net"),
            ColumnDescriptor(name='say "hello"'),
        ],
        rows=[["EMEA", 42]],
    )
    assert csv_text == '"gross, net","say ""hello"""\nEMEA,42\n'


def test_render_csv_renders_null_cells_as_empty() -> None:
    csv_text = render_query_result_csv(
        columns=[ColumnDescriptor(name="value")],
        rows=[[None]],
    )
    assert csv_text == "value\n\n"


def test_render_csv_caps_output_at_ten_thousand_rows() -> None:
    rows = [[index] for index in range(MAX_CSV_DATA_ROWS + 25)]
    csv_text = render_query_result_csv(
        columns=[ColumnDescriptor(name="n")],
        rows=rows,
    )
    lines = csv_text.strip().split("\n")
    assert lines[0] == "n"
    assert len(lines) == MAX_CSV_DATA_ROWS + 1
    assert lines[-1] == str(MAX_CSV_DATA_ROWS - 1)
