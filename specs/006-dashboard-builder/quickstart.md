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

Default dev URL: **http://localhost:3000**. Ensure `API_PUBLIC_URL` or `NEXT_PUBLIC_API_PUBLIC_URL` points at the API.

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
8. For a `table` widget, `GET .../widgets/{widget_id}/export.csv?filter_state=...` as an authorized user and verify headers plus ≤10,000 rows.
9. Sign in as an `external_client` with an explicit dashboard `asset_grant` and confirm dashboard view works without SQL or connection fields.
10. `POST .../clone` into another permitted collection and verify new owner plus target-collection permissions.

## Acceptance checklist

- [ ] Duplicate dashboard title in same collection returns 409
- [ ] Same title allowed in different collections
- [ ] Widget without binding ignores unrelated global filter changes
- [ ] Visible override indicator shown when override active
- [ ] Filter change does not reuse prior filter-state cache
- [ ] Stale dashboard PATCH rejected with 409
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
