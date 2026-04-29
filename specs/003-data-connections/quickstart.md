# Quickstart: Data Connections + Credentials

**Feature**: 003-data-connections  
**Audience**: engineer implementing or validating data connection management.  
**Goal**: prove admins can configure one tenant Snowflake connection while credentials remain Vault-only, metadata remains tenant-bound, tests are sanitized, and rotations activate only after success.

This quickstart assumes Features 1 and 2 are present: `apps/api`, `apps/web`, Alembic migrations, structured logging, health/readiness checks, Supabase Auth, tenant/workspace resolution, active memberships, and admin role enforcement.

## 1. Prerequisites

Install and sync dependencies:

```bash
pnpm install
uv sync --directory apps/api
```

Required local services and configuration:

- Supabase project or local equivalent with Auth, Postgres, and Vault enabled.
- Supabase Postgres connection string available to the API as `DATABASE_URL`.
- Supabase service credentials available only to the API for Vault operations.
- Snowflake test account or mocked Snowflake connector for local contract/integration tests.
- Operator-created tenant, workspace, and active admin membership fixture from Feature 2.

Feature 3 does not add query execution, saved-question CRUD, dashboard CRUD, multiple connections per tenant, non-Snowflake connectors, or connection delete/disable.

## 2. Apply database migration

From the repo root:

```bash
uv run --directory apps/api alembic upgrade head
```

Expected Feature 3 metadata tables:

- `data_connections`
- `connection_test_results`
- `connection_management_audit_records`

Verify that `data_connections.tenant_id` is unique and that audit/test tables include tenant-scoped lookup indexes.

## 3. Run the API and web app

Use two terminals:

```bash
uv run --directory apps/api uvicorn app.main:app --reload --port 8000
```

```bash
pnpm --filter @dashboardy/web dev
```

Health checks should continue to pass:

```bash
curl -s http://localhost:8000/health
curl -s http://localhost:8000/ready
```

## 4. Validate empty connection state

As an admin:

```bash
curl -s http://localhost:8000/workspaces/<workspace_id>/connection \
  -H "Authorization: Bearer <admin-jwt>"
```

Expected:

- HTTP 200.
- Response status is `not_configured`.
- No credential value or Vault secret ID is returned.

As a non-admin:

```bash
curl -i http://localhost:8000/workspaces/<workspace_id>/connection \
  -H "Authorization: Bearer <viewer-jwt>"
```

Expected: HTTP 403 with `error_code: authz_denied`.

## 5. Create and test a connection

As admin, submit metadata and credentials:

```bash
curl -s -X PUT http://localhost:8000/workspaces/<workspace_id>/connection \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Primary Snowflake",
    "warehouse": "ANALYTICS_WH",
    "database": "ANALYTICS",
    "schema": "PUBLIC",
    "credentials": {
      "account": "<account>",
      "username": "<username>",
      "password": "<password>",
      "role": "<select_only_role>"
    }
  }'
```

Expected:

- HTTP 201 Created on first-time connection creation; HTTP 200 OK on subsequent updates (upserts).
- Response status is `pending_test` until validation succeeds.
- Response includes metadata only: name, warehouse, database, schema, status, timestamps, and sanitized error fields.
- Response does not include `credentials.password`, other plaintext credential values, or a raw Vault secret ID.

Run the connection test:

```bash
curl -s -X POST http://localhost:8000/workspaces/<workspace_id>/connection/test \
  -H "Authorization: Bearer <admin-jwt>"
```

Expected success:

- HTTP 200.
- Response status is `active`.
- `last_tested_at` and `last_successful_test_at` are populated.
- An audit record exists for create and test attempts.

Expected failure with bad credentials:

- HTTP 200.
- Response field `test_status` is `failure`.
- Response includes `failure_category`, and its value is one of: `credential`, `network`, `permission`, `timeout`, `unknown`.
- `last_error` is sanitized and categorized.
- No plaintext credential appears in response, logs, or audit records.

## 6. Validate one connection per tenant

Repeat the create request for a tenant that already has a connection.

Expected:

- The `upsert` request updates the existing tenant connection metadata rather than creating a second connection record.
- The database still has one `data_connections` row for the tenant.

## 7. Validate credential rotation

As admin, submit replacement credentials:

```bash
curl -s -X POST http://localhost:8000/workspaces/<workspace_id>/connection/rotate \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "credentials": {
      "account": "<account>",
      "username": "<username>",
      "password": "<new-password>",
      "role": "<select_only_role>"
    }
  }'
```

Expected before test:

- Status becomes `pending_test`.
- New credential values are not returned.
- Previous active credential remains effective until the new credentials pass testing.

Run the test endpoint again.

Expected after success:

- Status returns to `active`.
- Secret version or equivalent rotation marker advances.
- New downstream data access will use the rotated credentials within 60 seconds.
- Audit records exist for rotate and test attempts.

Expected after failure:

- Status becomes `test_failed`.
- Sanitized failure category is visible.
- Previous active credential remains effective.

## 8. Validate web behavior

Manual web smoke:

1. Sign in as admin.
2. Navigate to the admin Connections page.
3. Confirm empty state shows setup required when no connection exists.
4. Submit connection metadata and credentials.
5. Confirm password fields clear after submit and are never echoed back.
6. Run test and confirm status badge updates to `active` or `test_failed`.
7. Rotate credentials and confirm the UI explains that activation requires a successful test.
8. Sign in as analyst/viewer/external client and confirm the Connections page or actions are inaccessible.

## 9. Run focused tests

From the repo root:

```bash
uv run --directory apps/api pytest tests/unit tests/integration tests/contract
pnpm --filter @dashboardy/web test
pnpm --filter @dashboardy/web exec playwright test tests/data-connections.spec.ts
```

Required assertions:

- Non-admin actions return `authz_denied`.
- Duplicate tenant connection creation is prevented.
- Credential values never appear in API JSON, logs, or audit records.
- Failed create/rotation tests do not activate submitted credentials.
- Successful rotation is visible to connection resolution within 60 seconds.
- All create, metadata update, test, and rotation attempts produce audit records.
