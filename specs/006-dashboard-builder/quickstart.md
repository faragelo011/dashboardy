# Quickstart: Dashboard Builder (Feature 6)

**Plan**: [plan.md](./plan.md) · **Contract**: [contracts/dashboards.openapi.yaml](./contracts/dashboards.openapi.yaml)

## Prerequisites

- Feature **2** (auth + tenancy): valid Supabase JWT, workspace membership, permission service including `asset_grants` for external clients.
- Feature **3**: tenant data connection available for execution smoke tests.
- Feature **4**: query engine with `widget` mode, cache identity, audit logging, timeout, and row caps.
- Feature **5**: at least one collection and saved question with scalar parameters for widget binding.
- Local environment matches prior features (`DATABASE_URL`, Supabase service settings, Snowflake settings for API).

## Database

```bash
cd apps/api && uv run alembic upgrade head
```

Feature 6 migrations create:

- `dashboards`
- `dashboard_widgets`
- `dashboard_grants`

## Run API

```bash
cd apps/api && uv run uvicorn app.main:app --reload --port 8000
```

## Run web

```bash
cd apps/web && pnpm dev
```

Default dev URL: **http://localhost:3000**.

- **Server Components / Route Handlers** (e.g. dashboards list page): set `API_PUBLIC_URL=http://localhost:8000` in `apps/web/.env.local` — read at request time, never exposed to the browser.
- **Client Components** (browser `fetch`): set `NEXT_PUBLIC_API_PUBLIC_URL=http://localhost:8000` so the value is bundled for client-side calls.

The web API clients (`questions-api.ts`, `dashboards-api.ts`) try `API_PUBLIC_URL` first, then fall back to `NEXT_PUBLIC_API_PUBLIC_URL`. For local dev, set both to the same API origin unless you deliberately split server vs client targets.

After changing shared contracts:

```bash
cd packages/types && pnpm build
```

## Smoke: build and consume a dashboard

1. Sign in as an `admin` or `analyst`.
2. `GET /me` and record `workspace_id`.
3. Ensure a collection and saved question exist from Feature 5.
4. `POST /workspaces/{workspace_id}/dashboards`:

   ```json
   {
     "collection_id": "00000000-0000-0000-0000-000000000001",
     "title": "Revenue Overview",
     "definition": {
       "layout_version": 1,
       "global_filters": [
         {
           "id": "gf_date",
           "label": "As of date",
           "value_type": "date",
           "default_value": "2026-01-01"
         }
       ]
     },
     "widgets": [
       {
         "widget_type": "kpi",
         "saved_question_id": "00000000-0000-0000-0000-000000000002",
         "layout": { "x": 0, "y": 0, "w": 4, "h": 2 },
         "config": {},
         "filter_bindings": { "gf_date": "as_of_date" },
         "filter_overrides": {}
       }
     ]
   }
   ```

5. `GET /workspaces/{workspace_id}/dashboards/{dashboard_id}` and confirm widgets and global filters are returned without `sql_text`.
6. `POST /workspaces/{workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/execute`:

   ```json
   {
     "global_filter_values": {
       "gf_date": "2026-06-01"
     }
   }
   ```

7. Change `gf_date` in the client and confirm bound widgets auto-refresh (parallel execute calls).
8. For a `table` widget, export with current global filter state:

   ```http
   GET /workspaces/{workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/export.csv?filter_state=%7B%22global_filter_values%22%3A%7B%22gf_date%22%3A%222026-06-01%22%7D%7D
   ```

   `filter_state` must be a URL-encoded JSON object matching `FilterStateExport`:

   ```json
   { "global_filter_values": { "gf_date": "2026-06-01" } }
   ```

   The server merges `global_filter_values` with the widget's stored `filter_overrides` before executing the export query. Verify CSV headers plus ≤10,000 rows.
9. Sign in as an `external_client` with an explicit dashboard `asset_grant` and confirm dashboard view works without SQL or connection fields.
10. `POST .../clone` into another permitted collection and verify new owner plus target-collection permissions.

## Acceptance checklist

### US1 — Authoring (MVP)

- [ ] Duplicate dashboard title in same collection returns 409
- [ ] Same title allowed in different collections
- [ ] Stale dashboard PATCH rejected with 409

### US2 — Global filters

- [ ] Widget without binding ignores unrelated global filter changes
- [ ] Filter change does not reuse prior filter-state cache

### US3 — Overrides

- [ ] Visible override indicator shown when override active

### US4 — Consumption and export

- [ ] External client never receives `sql_text`
- [ ] Table widget paging is client-side only
- [ ] CSV export refused for external client without `can_export`
- [ ] KPI/bar/line widgets have no CSV export affordance

## Tests

```bash
cd apps/api && uv run pytest tests/unit tests/contract tests/integration -q -k dashboard
cd apps/web && pnpm test
```

Integration tests require Postgres (Testcontainers/Docker when available).
