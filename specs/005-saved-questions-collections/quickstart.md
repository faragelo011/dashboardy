# Quickstart: Saved Questions and Collections (Feature 5)

**Plan**: [plan.md](./plan.md) · **Contract**: [contracts/saved-questions.openapi.yaml](./contracts/saved-questions.openapi.yaml)

## Prerequisites

- Feature **2** (auth + tenancy): valid Supabase JWT, active workspace membership, permission service.
- Feature **3**: tenant has a usable data connection for execution/export smoke tests.
- Feature **4**: query engine migrations and execute pipeline available, including saved-question mode, audit logging, cache helpers, timeout, and row caps.
- Local environment from repo root matches prior features (`DATABASE_URL`, Supabase service settings, Snowflake settings for API).

## Database

```bash
cd apps/api && uv run alembic upgrade head
```

Feature 5 migrations create or finalize:

- `collections`
- `saved_questions`
- `question_grants`
- `collection_grants.permission` alignment to `view` / `edit`
- deferred saved-question FKs from audit or external grants where practical

## Run API

```bash
cd apps/api && uv run uvicorn app.main:app --reload --port 8000
```

## Run web

```bash
cd apps/web && pnpm dev
```

Default dev URL: **http://localhost:3000**. Ensure `API_PUBLIC_URL` or `NEXT_PUBLIC_API_PUBLIC_URL` points at the API, for example `http://localhost:8000`.

Web CSV downloads use the authenticated Next.js proxy at `GET /api/workspaces/{workspace_id}/questions/{question_id}/export`, which forwards to the API `export.csv` route with the signed-in session token.

After changing shared contracts, rebuild web types before lint/build:

```bash
cd packages/types && pnpm build
```

Integration and contract tests require a live Postgres instance (Testcontainers/Docker when available). Without Docker, API integration tests are skipped locally while unit/contract collection still runs.

Playwright smoke for Feature 5 lives in `apps/web/tests/saved-questions.spec.ts` and runs via:

```bash
cd apps/web && pnpm test
```

The Playwright harness starts the web app on port **3005** and expects a mock API on **127.0.0.1:4010** (see `playwright.config.ts`).

## Smoke: create and run saved question

1. Sign in as an `admin` or `analyst`.
2. `GET /me` and record `workspace_id`.
3. `POST /workspaces/{workspace_id}/collections`:

   ```json
   {
     "name": "Revenue"
   }
   ```

4. `POST /workspaces/{workspace_id}/questions`:

   ```json
   {
     "collection_id": "00000000-0000-0000-0000-000000000001",
     "title": "Revenue by Day",
     "description": "Daily revenue for a selected date",
     "sql_text": "SELECT CURRENT_DATE AS day, 1 AS revenue",
     "parameters": [
       {
         "name": "as_of_date",
         "type": "date",
         "required": false,
         "label": "As of date"
       }
     ]
   }
   ```

5. `POST /workspaces/{workspace_id}/questions/{question_id}/execute` with optional scalar parameters and `bypass_cache: true` when validating the force-fresh path.
6. Expect **200** with `columns`, `rows`, and `meta.status`, or a typed refusal (`authz_denied`, `invalid_parameters`, `rejected_by_parser`, `warehouse_busy`).
7. Verify `query_audit_logs.saved_question_id` is populated for the execution.

## Smoke: CSV export

1. Call `GET /workspaces/{workspace_id}/questions/{question_id}/export.csv`. For parameterized exports, send deep-object query parameters such as `?parameters[as_of_date]=2026-06-01&bypass_cache=true`.
2. Expect `text/csv` with headers and no more than 10,000 data rows.
3. Repeat as an external client without `can_export`; expect **403** with `export_not_permitted` or `authz_denied`.

## Acceptance checklist

Complete manually in dev/staging or tick when covered by automated tests. File issues for gaps rather than expanding Feature 5 scope.

- [ ] Collection names are unique within a workspace; duplicates return a typed conflict.
- [ ] Deleting a collection with active saved questions is refused with guidance to move/delete questions first.
- [ ] Collection and saved-question list/detail results are permission-filtered across `admin`, `analyst`, `viewer`, and `external_client`.
- [ ] External clients can access only explicit saved-question asset grants and never receive `sql_text` or connection metadata.
- [ ] `view` and `edit` grants widen only; no deny grants exist.
- [ ] Saved-question create/update validates scalar parameter declarations (`string`, `number`, `boolean`, `date`) and rejects unknown/invalid runtime bindings before execution.
- [ ] Stale collection and saved-question updates are rejected without overwriting the newer record.
- [ ] Clone creates a new saved question owned by the cloning analyst/admin and inherits the target collection permissions, not source explicit grants.
- [ ] Saved-question execute delegates to Feature 4, writes audit rows with `saved_question_id`, and offers a force-fresh UI action that sends `bypass_cache: true`.
- [ ] Saved-question SQL or parameter-schema updates invalidate reusable cached results before later executions can reuse stale data.
- [ ] CSV export uses the same authorization/parameter/execution path and caps output at 10,000 rows.
- [ ] CSV export accepts declared scalar runtime parameters using the documented `parameters[name]=value` query serialization.
- [ ] Internal `admin`, `analyst`, and `viewer` roles can export visible saved questions; external clients require explicit `can_export`.
- [ ] Dashboards, widgets, nested collections, comments, version history, public links, XLSX, and async export jobs remain absent.
