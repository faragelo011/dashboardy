# Tasks: Auth + Tenancy

**Input**: Design documents from `/specs/002-auth-tenancy/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/auth-tenancy.openapi.yaml`, `quickstart.md`

**Tests**: Tests are included because the specification and quickstart define required acceptance scenarios for auth, tenancy, membership management, and external grants.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently after the shared foundation is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase because it touches different files and does not depend on unfinished work.
- **[Story]**: User story label for story phases only.
- Every task names the exact file path to change or create.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add required dependencies, shared types, and environment configuration needed by all auth + tenancy work.

- [X] T001 Add API dependencies for Supabase JWT verification and cryptography in `apps/api/pyproject.toml` (`pyjwt[crypto]` or equivalent, plus any JWKS helper only if needed).
- [X] T002 Add web dependency `@supabase/ssr` for session-only auth in `apps/web/package.json`.
- [X] T003 [P] Add auth/tenancy shared TypeScript types for roles, membership status, `/me`, members, and asset grants in `packages/types/src/auth-tenancy.ts`.
- [X] T004 Export the new auth/tenancy types from `packages/types/src/index.ts`.
- [X] T005 [P] Add canonical auth environment variable names and comments in `packages/config/README.md`.
- [X] T006 [P] Document local auth + tenancy environment variables in `apps/api/README.md`.
- [X] T007 [P] Document web Supabase auth environment variables in `apps/web/README.md`.
- [X] T008 Run dependency lockfile update for API and web package changes, updating `apps/api/uv.lock` and `pnpm-lock.yaml`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the database schema, backend domain modules, auth context primitives, fixtures, and route wiring that all user stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T009 Create Feature 2 Alembic migration for `tenants`, `workspaces`, `memberships`, `collection_grants`, and `asset_grants` in `apps/api/app/db/migrations/versions/0002_auth_tenancy.py`.
- [ ] T010 Create SQLAlchemy tenant/workspace/membership/grant models with enums in `apps/api/app/models/auth_tenancy.py`.
- [ ] T011 Update model exports so Alembic can discover Feature 2 models in `apps/api/app/models/__init__.py`.
- [ ] T012 [P] Add Pydantic schemas for auth context, workspace context, members, and grants in `apps/api/app/auth_context/schemas.py`.
- [ ] T013 [P] Add Pydantic schemas for admin member and grant requests/responses in `apps/api/app/admin/schemas.py`.
- [ ] T014 Create authenticated user context dataclass and token error types in `apps/api/app/auth_context/context.py`.
- [ ] T015 Implement Supabase JWT verification helpers with JWKS/cache-safe validation in `apps/api/app/auth_context/jwt.py`.
- [ ] T016 Implement FastAPI dependency that returns authenticated `user_id` or raises 401 in `apps/api/app/auth_context/dependencies.py`.
- [ ] T017 Create tenancy resolver skeleton that loads active membership, tenant, workspace, role, and status in `apps/api/app/tenancy/resolver.py`.
- [ ] T018 Create central permission decision object and reason-code enum in `apps/api/app/tenancy/permissions.py`.
- [ ] T019 Implement base permission rules for admin, analyst, viewer, external client, inactive membership, tenant mismatch, collection grants, and asset grants in `apps/api/app/tenancy/permissions.py`.
- [ ] T020 Add database repository helpers for tenants, workspaces, memberships, collection grants, and asset grants in `apps/api/app/tenancy/repository.py`.
- [ ] T021 Add a test fixture factory for tenants, workspaces, users, memberships, and grants in `apps/api/tests/factories/auth_tenancy.py`.
- [ ] T022 [P] Add unit tests for JWT dependency success/failure behavior in `apps/api/tests/unit/test_auth_context.py`.
- [ ] T023 [P] Add unit tests for permission reason codes and role baseline in `apps/api/tests/unit/test_permission_service.py`.
- [ ] T024 [P] Add migration tests for Feature 2 tables, enums/checks, tenant indexes, and unique constraints in `apps/api/tests/test_auth_tenancy_migration.py`.
- [ ] T025 Create package marker files for new backend domains in `apps/api/app/auth_context/__init__.py`, `apps/api/app/tenancy/__init__.py`, and `apps/api/app/admin/__init__.py`.

**Checkpoint**: Foundation ready. Database schema, auth dependency, tenancy resolver, permission service, and reusable fixtures are in place.

---

## Phase 3: User Story 1 - Access Protected Workspace (Priority: P1) MVP

**Goal**: A signed-in workspace member reaches protected content only after user, tenant, workspace, role, and status are resolved; unauthenticated users and users without active membership are denied before tenant data is returned.

**Independent Test**: Call `GET /me` with no token, a valid token without membership, an active member token, and an inactive member token; verify 401/403/200 behavior and no tenant data leaks on denial.

### Tests for User Story 1

- [ ] T026 [P] [US1] Add contract tests for `GET /me` 200/401/403 responses in `apps/api/tests/contract/test_me_contract.py`.
- [ ] T027 [P] [US1] Add integration tests for missing JWT, invalid JWT, no membership, active membership, and inactive membership in `apps/api/tests/integration/test_me_resolution.py`.
- [ ] T028 [P] [US1] Add Playwright smoke test for signed-out protected-route redirect/denied state in `apps/web/tests/auth-tenancy.spec.ts`.

### Implementation for User Story 1

- [ ] T029 [P] [US1] Implement `/me` response builder using resolved tenancy context in `apps/api/app/routes/me.py`.
- [ ] T030 [US1] Implement `GET /me` route with auth dependency and tenancy resolver in `apps/api/app/routes/me.py`.
- [ ] T031 [US1] Ensure `GET /me` returns 401 for missing/invalid JWT and 403 for no active membership in `apps/api/app/routes/me.py`.
- [ ] T032 [P] [US1] Add API client helper for `GET /me` in `apps/web/app/lib/api.ts`.
- [ ] T033 [P] [US1] Add Supabase browser/server session helpers in `apps/web/app/lib/supabase.ts`.
- [ ] T034 [US1] Create protected layout that restores session, calls `GET /me`, and blocks protected content on denial in `apps/web/app/(protected)/layout.tsx`.
- [ ] T035 [US1] Create a minimal protected home page that displays workspace name and role in `apps/web/app/(protected)/page.tsx`.
- [ ] T036 [US1] Create sign-in page using Supabase auth session flow in `apps/web/app/(auth)/sign-in/page.tsx`.
- [ ] T037 [US1] Create sign-out route or action that clears Supabase session in `apps/web/app/(auth)/sign-out/route.ts`.
- [ ] T038 [US1] Wire API router import for `me` route in `apps/api/app/routes/__init__.py`.

**Checkpoint**: User Story 1 is complete when `/me` satisfies the contract and the web protected shell shows only for active members.

---

## Phase 4: User Story 2 - Admin Manages Workspace Members (Priority: P2)

**Goal**: An admin can invite members, assign roles, change roles, and deactivate memberships while non-admins are denied member-management actions.

**Independent Test**: Sign in as admin to invite a member and update their role/status; sign in as viewer/analyst/external client and verify member-management endpoints return 403.

### Tests for User Story 2

- [ ] T039 [P] [US2] Add contract tests for `GET/POST /workspaces/{workspace_id}/members` in `apps/api/tests/contract/test_members_contract.py`.
- [ ] T040 [P] [US2] Add contract tests for `PATCH /workspaces/{workspace_id}/members/{membership_id}` in `apps/api/tests/contract/test_member_update_contract.py`.
- [ ] T041 [P] [US2] Add integration tests for admin invite, duplicate invite conflict/idempotency, role change, deactivation, and non-admin denial in `apps/api/tests/integration/test_member_management.py`.
- [ ] T042 [P] [US2] Add Playwright smoke tests for admin member page access and non-admin denial in `apps/web/tests/auth-tenancy.spec.ts`.

### Implementation for User Story 2

- [ ] T043 [P] [US2] Implement membership repository methods for list, create, update role, deactivate, and duplicate lookup in `apps/api/app/tenancy/repository.py`.
- [ ] T044 [P] [US2] Implement Supabase Admin invite adapter interface with a test double-friendly boundary in `apps/api/app/admin/supabase_admin.py`.
- [ ] T045 [US2] Implement member management service that enforces admin-only actions and duplicate membership behavior in `apps/api/app/admin/members_service.py`.
- [ ] T046 [US2] Implement `GET /workspaces/{workspace_id}/members` admin route in `apps/api/app/admin/routes.py`.
- [ ] T047 [US2] Implement `POST /workspaces/{workspace_id}/members` admin invite route in `apps/api/app/admin/routes.py`.
- [ ] T048 [US2] Implement `PATCH /workspaces/{workspace_id}/members/{membership_id}` role/status update route in `apps/api/app/admin/routes.py`.
- [ ] T049 [US2] Ensure deactivation sets `status=inactive` and `deactivated_at` without deleting the membership in `apps/api/app/admin/members_service.py`.
- [ ] T050 [US2] Add admin router registration in `apps/api/app/main.py`.
- [ ] T051 [P] [US2] Add web API helpers for listing, inviting, and updating members in `apps/web/app/lib/members-api.ts`.
- [ ] T052 [US2] Create admin members page with member list, invite form, role selector, and deactivate action in `apps/web/app/members/page.tsx`.
- [ ] T053 [US2] Hide or block the members page for non-admin roles using `/me` role context in `apps/web/app/members/page.tsx`.

**Checkpoint**: User Story 2 is complete when admins can manage memberships and every non-admin member-management attempt is denied.

---

## Phase 5: User Story 3 - External Client Receives Limited Access (Priority: P3)

**Goal**: Admins can grant external clients access to specific assets only, export permission defaults to false, and external clients cannot receive internal collection-inherited access or sensitive authoring details.

**Independent Test**: Invite an external client, create one asset grant, verify grant lookup allows only that asset, verify collection grants do not authorize external clients, and verify grant responses contain no SQL or connection fields.

### Tests for User Story 3

- [ ] T054 [P] [US3] Add contract tests for `GET/POST /workspaces/{workspace_id}/asset-grants` in `apps/api/tests/contract/test_asset_grants_contract.py`.
- [ ] T055 [P] [US3] Add contract tests for `DELETE /workspaces/{workspace_id}/asset-grants/{grant_id}` in `apps/api/tests/contract/test_asset_grant_delete_contract.py`.
- [ ] T056 [P] [US3] Add integration tests for create grant, list grants, delete grant, default `can_export=false`, non-admin denial, and duplicate grant behavior in `apps/api/tests/integration/test_asset_grants.py`.
- [ ] T057 [P] [US3] Add permission tests proving external clients cannot use collection grants and can use only explicit asset grants in `apps/api/tests/unit/test_external_client_permissions.py`.

### Implementation for User Story 3

- [ ] T058 [P] [US3] Implement asset grant repository methods for create/update, list, lookup, and delete in `apps/api/app/tenancy/repository.py`.
- [ ] T059 [US3] Implement asset grant service enforcing admin-only management, external-client membership validation, and default `can_export=false` in `apps/api/app/admin/asset_grants_service.py`.
- [ ] T060 [US3] Implement `GET /workspaces/{workspace_id}/asset-grants` route in `apps/api/app/admin/routes.py`.
- [ ] T061 [US3] Implement `POST /workspaces/{workspace_id}/asset-grants` route in `apps/api/app/admin/routes.py`.
- [ ] T062 [US3] Implement `DELETE /workspaces/{workspace_id}/asset-grants/{grant_id}` route in `apps/api/app/admin/routes.py`.
- [ ] T063 [US3] Update permission service asset-grant checks for `question` and `dashboard` resources in `apps/api/app/tenancy/permissions.py`.
- [ ] T064 [US3] Ensure all external-client grant response schemas exclude SQL text, connection metadata, and authoring controls in `apps/api/app/admin/schemas.py`.
- [ ] T065 [P] [US3] Add web API helpers for asset grant list/create/delete in `apps/web/app/lib/asset-grants-api.ts`.
- [ ] T066 [US3] Add minimal admin UI for external-client asset grants in `apps/web/app/members/page.tsx`.

**Checkpoint**: User Story 3 is complete when external clients can be granted only specific assets and cannot gain access through internal collection grants.

---

## Phase 6: User Story 4 - Single-Workspace MVP Experience (Priority: P4)

**Goal**: Members see the current workspace name and are not asked to choose among multiple workspaces in the MVP.

**Independent Test**: Sign in as any active member and verify the UI displays the workspace name while workspace switching is hidden or disabled; call the workspace switch endpoint with the current workspace and with an unavailable workspace.

### Tests for User Story 4

- [ ] T067 [P] [US4] Add contract tests for `POST /workspaces/switch` success and denial responses in `apps/api/tests/contract/test_workspace_switch_contract.py`.
- [ ] T068 [P] [US4] Add integration tests for current-workspace no-op and unavailable-workspace denial in `apps/api/tests/integration/test_workspace_switch.py`.
- [ ] T069 [P] [US4] Add Playwright smoke test for workspace name display and hidden/disabled switcher in `apps/web/tests/auth-tenancy.spec.ts`.

### Implementation for User Story 4

- [ ] T070 [US4] Implement `POST /workspaces/switch` no-op/stub route for the current workspace in `apps/api/app/routes/workspaces.py`.
- [ ] T071 [US4] Ensure `POST /workspaces/switch` denies unavailable workspace IDs with 403 and no tenant data in `apps/api/app/routes/workspaces.py`.
- [ ] T072 [US4] Wire workspace route import in `apps/api/app/routes/__init__.py`.
- [ ] T073 [US4] Add workspace display component that shows workspace name and hides/disables switching in `apps/web/app/(protected)/workspace-badge.tsx`.
- [ ] T074 [US4] Use the workspace display component in the protected layout in `apps/web/app/(protected)/layout.tsx`.

**Checkpoint**: User Story 4 is complete when the one-workspace MVP behavior is visible in the UI and enforced by the API stub.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, generated artifacts, and cleanup across all completed stories.

- [ ] T075 [P] Update Feature 2 quickstart validation notes after implementation in `specs/002-auth-tenancy/quickstart.md`.
- [ ] T076 [P] Add OpenAPI contract usage notes for implementers in `specs/002-auth-tenancy/contracts/README.md`.
- [ ] T077 [P] Add normalized auth/tenancy error-code documentation in `apps/api/README.md`.
- [ ] T078 Regenerate or manually align shared TypeScript API types from `specs/002-auth-tenancy/contracts/auth-tenancy.openapi.yaml` into `packages/types/src/auth-tenancy.ts`.
- [ ] T079 Run API validation commands for `apps/api`: `uv run --directory apps/api pytest` and `uv run --directory apps/api ruff check .`.
- [ ] T080 Run web validation commands for `apps/web`: `pnpm --filter @dashboardy/web lint` and `pnpm --filter @dashboardy/web test`.
- [ ] T081 Run monorepo validation commands from `package.json`: `pnpm lint` and `pnpm test`.
- [ ] T082 Verify quickstart acceptance checklist manually and record any follow-up notes in `specs/002-auth-tenancy/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies; can start immediately.
- **Phase 2 Foundational**: Depends on Phase 1 completion; blocks all user stories.
- **Phase 3 US1**: Depends on Phase 2; MVP slice.
- **Phase 4 US2**: Depends on Phase 2 and uses US1 auth context; can be implemented after US1 route contracts are stable.
- **Phase 5 US3**: Depends on Phase 2 and uses US2 admin/member service patterns.
- **Phase 6 US4**: Depends on Phase 2 and US1 `/me` context; can run in parallel with US2/US3 after US1 context shape is stable.
- **Phase 7 Polish**: Depends on all desired story phases being complete.

### User Story Dependencies

- **US1 (P1) Access Protected Workspace**: No story dependency after Phase 2. This is the MVP.
- **US2 (P2) Admin Manages Workspace Members**: Requires Phase 2 and benefits from US1 context resolution, but remains testable through member endpoints.
- **US3 (P3) External Client Receives Limited Access**: Requires Phase 2 and admin-member foundations from US2.
- **US4 (P4) Single-Workspace MVP Experience**: Requires Phase 2 and US1 `/me` workspace context.

### Within Each User Story

- Write contract/integration/unit tests first and confirm they fail for the missing behavior.
- Implement models/repositories before services.
- Implement services before route handlers.
- Implement API behavior before web UI that depends on it.
- Complete the checkpoint before moving to the next story.

---

## Parallel Opportunities

- T003, T005, T006, and T007 can run in parallel after T001/T002 decisions are accepted because they touch separate documentation/type files.
- T012 and T013 can run in parallel because they create separate schema modules.
- T022, T023, and T024 can run in parallel after foundational modules exist.
- US1 tests T026, T027, and T028 can run in parallel.
- US1 implementation T029, T032, and T033 can start in parallel after foundational auth context exists.
- US2 tests T039, T040, T041, and T042 can run in parallel.
- US2 implementation T043 and T044 can run in parallel before T045 combines them.
- US3 tests T054, T055, T056, and T057 can run in parallel.
- US3 implementation T058 and T065 can run in parallel because backend repository and web helper files are separate.
- US4 tests T067, T068, and T069 can run in parallel.
- Polish documentation tasks T075, T076, and T077 can run in parallel.

## Parallel Example: User Story 1

```text
Task: "T026 [P] [US1] Add contract tests for GET /me in apps/api/tests/contract/test_me_contract.py"
Task: "T027 [P] [US1] Add integration tests for /me resolution in apps/api/tests/integration/test_me_resolution.py"
Task: "T028 [P] [US1] Add Playwright smoke test in apps/web/tests/auth-tenancy.spec.ts"
```

## Parallel Example: User Story 2

```text
Task: "T043 [P] [US2] Implement membership repository methods in apps/api/app/tenancy/repository.py"
Task: "T044 [P] [US2] Implement Supabase Admin invite adapter in apps/api/app/admin/supabase_admin.py"
Task: "T051 [P] [US2] Add web member API helpers in apps/web/app/lib/members-api.ts"
```

## Parallel Example: User Story 3

```text
Task: "T054 [P] [US3] Add asset grant contract tests in apps/api/tests/contract/test_asset_grants_contract.py"
Task: "T055 [P] [US3] Add asset grant delete contract tests in apps/api/tests/contract/test_asset_grant_delete_contract.py"
Task: "T057 [P] [US3] Add external-client permission tests in apps/api/tests/unit/test_external_client_permissions.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 Setup.
2. Complete Phase 2 Foundational.
3. Complete Phase 3 User Story 1.
4. Stop and validate: `/me` 401/403/200 behavior, protected layout, and no tenant-data leakage on denial.
5. Demo or checkpoint before member-management work.

### Incremental Delivery

1. Setup + Foundational: schema, auth dependency, tenancy resolver, permission service.
2. US1: protected workspace access and `/me`.
3. US2: admin membership management and deactivation.
4. US3: explicit external-client asset grants.
5. US4: one-workspace UI and switch stub.
6. Polish: docs, generated/shared types, validation commands.

### Guidance For Cheaper Implementation Models

- Do one task at a time in numeric order unless the task is marked `[P]`.
- Before editing a file, read the target file and nearby imports.
- Keep route handlers thin; put authorization and membership logic in `apps/api/app/tenancy/` or `apps/api/app/admin/*_service.py`.
- Do not add query execution, Snowflake, saved-question CRUD, dashboard CRUD, public links, or multi-workspace onboarding in this feature.
- After each story checkpoint, run only that story's relevant tests before moving on.
