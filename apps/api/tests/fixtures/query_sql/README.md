# Query SQL fixtures (golden cases)

Golden files back SC-001 parser acceptance rules for Feature 004. Each sibling file is a
single raw SQL blob (ASCII, no BOM) ending with newline.

## Layout

| Directory | Meaning |
|-----------|---------|
| `allowed/` | Must parse + canonicalize (`parse_and_validate`) without raising. |
| `denied/` | Must raise ``QueryParserError`` with structural rejection (**before Snowflake**). |

## Contributing

1. Choose `allowed/` vs `denied/` based on the warehouse posture (read-only SELECT / WITH /
   UNION-style combinations vs hostile or multi-statement text).
2. Keep each file narrowly focused (**one behavioral axis** per file) so regressions pinpoint
   the failing policy branch.
3. Run ``uv run pytest apps/api/tests/unit/test_query_parser.py`` once landed (Phase 3 task
   **T022** maintains the harness).
