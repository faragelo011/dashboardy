# Query Engine OpenAPI Contract

Primary artifact: [`query-execute.openapi.yaml`](./query-execute.openapi.yaml).

## How to consume it

- **Bearer auth**: Same Supabase-issued JWT model as Features 2–3.
- **Ad hoc execution** is author-only in Feature 4: `admin` and `analyst` may run it; `viewer` and `external_client` users never reach parser or warehouse dispatch and should receive **403** with `authz_denied`.
- **`422` structural / binding failures** should populate `error_code` with `rejected_by_parser` or a fine-grained sub-code mapped in the API catalog.
- **`429 warehouse_busy`** is the deterministic overload signal mandated by constitution §8.2 — not a silent **500**.
- **`200` payloads** deliberately carry `meta.status` for `ok`, `timeout`, `row_limit_exceeded`, and `warehouse_error` so dashboards can branch without inferring semantics from HTTP status alone.

## Implementation caveats

| Contract area | Practical behavior |
|---------------|--------------------|
| `saved_question` / `widget` | Request shapes are reserved for Features 5–6. Feature 4 should short-circuit these modes before parser/Snowflake unless an owning asset layer supplies explicit authorization and SQL context. |
| `filter_state_hash` | Mandatory for cache correctness once multiple filter states exist; optional only during early harnesses. |
| Row caps | Server enforces constitution §7.4 defaults (5k / 10k hard). |
| Cache | Ad hoc requests never set `cache_hit=true` in audit or response. |

Bump `info.version` when breaking request/response shapes ship.
