# Quickstart: Auth + Tenancy

**Feature**: 002-auth-tenancy  
**Audience**: engineer implementing or validating the auth + tenancy feature.  
**Goal**: prove every protected tenant-scoped action resolves user, tenant, workspace, and role or denies access before tenant data is returned.

This quickstart assumes Feature 1 foundation is present: `apps/api`, `apps/web`, Alembic migrations, structured logging, and health/readiness checks.

## 1. Prerequisites

Install and sync dependencies:

```bash
pnpm install
uv sync --directory apps/api
```

Required local services and configuration:

- Supabase project or local equivalent with Auth enabled.
- Supabase Postgres connection string available to the API as `DATABASE_URL`.
- Supabase Auth settings available to the API for JWT verification.
- Web app auth/session settings for Supabase sign-in.
- Operator-created tenant, workspace, and initial admin membership fixture.

Feature 2 does not add Snowflake, data connections, query execution, saved-question CRUD, or dashboard CRUD.

## 2. Apply database migration

From the repo root:

```bash
uv run --directory apps/api alembic upgrade head
```

Expected Feature 2 metadata tables:

- `tenants`
- `workspaces`
- `memberships`
- `collection_grants`
- `asset_grants`

Verify that the tenant/workspace fixture satisfies one workspace per tenant and includes one active admin membership.

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

## 4. Validate protected context

Sign in as the pre-provisioned admin and call:

```bash
curl -s http://localhost:8000/me \
  -H "Authorization: Bearer <admin-jwt>"
```

Expected result:

- HTTP 200.
- Response includes user ID, tenant ID, workspace ID, workspace name, role `admin`, and membership status `active`.
- No connection metadata, SQL text, or BI warehouse data appears.

Negative checks:

```bash
curl -i http://localhost:8000/me
```

Expected: HTTP 401 with `error_code: auth_required`.

Call `/me` with a valid user who has no membership.

Expected: HTTP 403 with `error_code: no_membership` (or `inactive_membership` if the user has a membership but it is inactive) and no tenant-scoped data.

## 5. Validate member management

As admin:

```bash
curl -s -X POST http://localhost:8000/workspaces/<workspace_id>/members \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"email":"analyst@example.com","role":"analyst"}'
```

Expected:

- HTTP 201.
- Membership has role `analyst` and status `active`.
- Repeating the same invite does not create a duplicate membership.

As non-admin:

```bash
curl -i -X POST http://localhost:8000/workspaces/<workspace_id>/members \
  -H "Authorization: Bearer <viewer-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","role":"viewer"}'
```

Expected: HTTP 403 with `authz_denied`.

## 6. Validate role and status changes

As admin, change a member role:

```bash
curl -s -X PATCH http://localhost:8000/workspaces/<workspace_id>/members/<membership_id> \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"role":"viewer"}'
```

Expected: the member's next protected action uses the new role.

Deactivate a member:

```bash
curl -s -X PATCH http://localhost:8000/workspaces/<workspace_id>/members/<membership_id> \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"status":"inactive"}'
```

Expected:

- The membership remains visible for history.
- The deactivated user's next protected action receives HTTP 403.
- No tenant data is returned for inactive membership context.

## 7. Validate external-client grants

As admin, invite an external client:

```bash
curl -s -X POST http://localhost:8000/workspaces/<workspace_id>/members \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"email":"client@example.com","role":"external_client"}'
```

Create an explicit asset grant:

```bash
curl -s -X POST http://localhost:8000/workspaces/<workspace_id>/asset-grants \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<external_user_id>","asset_type":"dashboard","asset_id":"<dashboard_id>","can_export":false}'
```

Expected:

- Grant is created with `can_export` false unless explicitly set true.
- External client access checks succeed only for explicitly granted assets.
- External client access checks deny collection-inherited access.
- External client responses do not expose SQL text, connection details, or authoring controls.

## 8. Validate web behavior

Manual web smoke:

- Signed-out user opening a protected route is guided to sign in.
- Signed-in member sees the workspace name.
- Workspace switcher is hidden or disabled while only one workspace exists.
- Admin can open the members surface.
- Non-admin members cannot access member management.

Playwright smoke should cover at least:

- session restore calls `/me`
- valid member reaches protected layout
- no-membership user sees denied state
- non-admin member management is denied

## 9. Test commands

Run API tests:

```bash
uv run --directory apps/api pytest
uv run --directory apps/api ruff check .
```

Run web checks:

```bash
pnpm --filter @dashboardy/web lint
pnpm --filter @dashboardy/web test
```

Run monorepo checks:

```bash
pnpm lint
pnpm test
```

## 10. Acceptance checklist

- [ ] Missing JWT returns 401 before tenant data is returned.
- [ ] Valid JWT without membership returns 403 before tenant data is returned.
- [ ] Active member receives user, tenant, workspace, role, and status from `/me`.
- [ ] Admin can invite a member and assign role in under 2 minutes.
- [ ] Non-admin member-management attempts return 403.
- [ ] Role changes apply to the affected user's next protected action.
- [ ] Deactivated memberships are denied on next protected action while history remains.
- [ ] Duplicate membership attempts do not create duplicate rows.
- [ ] External clients only access explicit asset grants.
- [ ] External-client export permission defaults to false.
- [ ] Workspace name appears in the protected UI and switching is hidden or disabled for one workspace.
