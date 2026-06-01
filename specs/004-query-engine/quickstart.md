# Quickstart: Query Engine (Feature 4)

**Plan**: [plan.md](./plan.md) · **Contract**: [contracts/query-execute.openapi.yaml](./contracts/query-execute.openapi.yaml)

## Prerequisites

- Feature **2** (auth + tenancy): valid Supabase JWT and workspace membership.
- Feature **3**: tenant `data_connections` row in **`active`** (or tests may mock Snowflake).
- Local env from repo root: `DATABASE_URL`, Supabase service settings, Snowflake-related vars for the API (see `packages/config` / `.env.example`).

## Database

```bash
cd apps/api && uv run alembic upgrade head
```

Migrations create these tables: `query_audit_logs`, `cache_entries`.

## Run API

```bash
cd apps/api && uv run uvicorn app.main:app --reload --port 8000
```

## Run web (internal query UI — Phase 6)

```bash
cd apps/web && pnpm dev
```

Default dev URL: **http://localhost:3000**. Ensure `API_PUBLIC_URL` or `NEXT_PUBLIC_API_PUBLIC_URL` points at the API (e.g. `http://localhost:8000`).

Signed-in workspace members with role **admin** or **analyst** see **Run query** in the top nav and can open **http://localhost:3000/query-run** to POST ad hoc SQL (`mode: adhoc`) and view **meta.status**, **meta.duration_ms**, **meta.truncated**, and full JSON. **`viewer`** and **`external_client`** users do not get the nav link and are redirected away from `/query-run` if they hit it directly.

Shared TypeScript shapes for the success envelope live in `packages/types/src/query-execute.ts` (aligned with the OpenAPI contract).

## Smoke: execute (after implementation)

1. Sign in via web or obtain a JWT another way.
2. `GET /me` — confirm `admin` or `analyst` membership on the target workspace.
3. `POST /workspaces/{workspace_id}/query/execute` with body:

   ```json
   {
     "mode": "adhoc",
     "sql_text": "SELECT 1 AS n",
     "parameters": {},
     "bypass_cache": false
   }
   ```

4. Expect **422** if SQL fails parser policy; **403** if principal is `viewer` or `external_client`; **429** if queue saturated; otherwise **200** with `columns`, `rows`, `meta.status`, `meta.duration_ms`, `meta.truncated`.
5. Verify a row landed in **`query_audit_logs`** with matching `tenant_id`, `workspace_id`, `user_id`, `sql_hash`, and `cache_hit=false` for ad hoc.

## Golden parser tests

- Add SQL fixtures under `apps/api/tests/fixtures/query_sql/allowed` and `apps/api/tests/fixtures/query_sql/denied` asserting **zero** Snowflake connector calls when policy rejects.

## Concurrency sanity

- Scripted burst: launch >10 concurrent executions; assert ≥ one **`warehouse_busy`** (HTTP **429**) or orderly queue completion without silent 500s.

## Acceptance checklist

Complete manually in dev/staging (or tick when covered by automated tests). File GitHub issues for gaps instead of expanding scope here.

- [ ] Parser rejects multi-statement, DDL/DML, and session mutation patterns (golden files).
- [ ] Row cap enforced at **10,000** hard / **5,000** default per constitution §7.4 with `truncated` + `row_limit_exceeded` when semantics require.
- [ ] **30s** warehouse timeout surfaced as `timeout`.
- [ ] **`viewer`** and **`external_client`** ad hoc requests never reach parser or Snowflake (**403** path).
- [ ] **`query_audit_logs`** row for every intentional attempt terminal path.
- [ ] **Web UI**: `/query-run` returns 200 for benign `SELECT 1` when API + connection are healthy and the caller is `admin`/`analyst`; summary shows `meta.status` / `duration_ms` / `truncated`; viewers cannot access the page.
- [ ] Cache: ad hoc never hits Postgres cache; service-level future-mode helpers respect KPI/chart/table TTL ceilings and permission re-check on read.
- [ ] TTL sweeper or periodic job deletes `expires_at < now()` cache rows.
