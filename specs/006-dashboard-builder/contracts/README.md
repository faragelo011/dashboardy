# Contracts: Dashboard Builder

Feature 6 exposes workspace-scoped dashboard APIs documented in [dashboards.openapi.yaml](dashboards.openapi.yaml).

The contract covers:

- permission-filtered dashboard list/create/detail/update/delete with per-collection title uniqueness
- widget create/update/delete within a dashboard
- dashboard clone into a target collection
- per-widget governed execute with merged filter state and optional `bypass_cache`
- synchronous table-widget CSV export capped at 10,000 rows

External clients may access only explicitly granted dashboards and never receive `sql_text`, `saved_question_id` internals beyond opaque references needed for execute, or connection metadata. Export requires separate export permission.

Consumer responses use DTOs that strip authoring-only fields for non-editors. Widget execute responses mirror Feature 4 query execute success envelopes.
