# Tasks: Data Connections + Credentials

**Input**: Design documents from `/specs/003-data-connections/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/data-connections.openapi.yaml`, `quickstart.md`

**Tests**: Tests are included because the specification and quickstart define required acceptance scenarios for admin-only access, one connection per tenant, Vault-only credentials, sanitized test failures, rotation activation, and audit coverage.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently after the shared foundation is complete. Each task is intentionally small and file-scoped so a lower-cost implementation model can follow it without inventing architecture.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase because it touches different files and does not depend on unfinished work.
- **[Story]**: User story label for story phases only.
- Every task names the exact file path to change or create.
- When a task mentions "no secrets", verify that plaintext credential values, raw Vault secret IDs, passwords, and private keys are not returned, logged, or stored outside Vault.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add dependencies, shared types, environment documentation, and package structure needed by all data connection work.

- [x] T001 Add API dependency `snowflake-connector-python` to `apps/api/pyproject.toml` and refresh `apps/api/uv.lock`.
- [x] T002 [P] Add shared connection TypeScript types for status, failure category, requests, responses, and sanitized errors in `packages/types/src/data-connections.ts`.
- [x] T003 Export the new data connection types from `packages/types/src/index.ts`.
- [x] T004 [P] Document Snowflake and Supabase Vault environment variable names in `packages/config/README.md`.
- [x] T005 [P] Document API-only Vault/Snowflake configuration and the no-secret logging rule in `apps/api/README.md`.
- [x] T006 [P] Document local admin connection page configuration in `apps/web/README.md`.
- [x] T007 Create connection package marker and module scaffold in `apps/api/app/connections/__init__.py`, `apps/api/app/connections/enums.py`, and `apps/api/app/connections/errors.py`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create schema, models, schemas, adapters, repositories, fixtures, and shared safety helpers that all user stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T008 Create Feature 3 Alembic migration for `data_connections`, `connection_test_results`, and `connection_management_audit_records` in `apps/api/app/db/migrations/versions/0003_data_connections.py`.
- [ ] T009 Create SQLAlchemy models and enums for data connections, connection test results, and connection management audit records in `apps/api/app/models/data_connections.py`.
- [ ] T010 Update model exports so Alembic discovers Feature 3 models in `apps/api/app/models/__init__.py`.
- [ ] T011 [P] Add Pydantic request/response schemas matching `contracts/data-connections.openapi.yaml` in `apps/api/app/connections/schemas.py`.
- [ ] T012 [P] Add connection lifecycle enums and constants for statuses, audit actions, outcomes, and failure categories in `apps/api/app/connections/enums.py`.
- [ ] T013 Add repository helpers for get-by-tenant, upsert metadata, write tests, write audits, promote pending secret, and clear pending secret in `apps/api/app/connections/repository.py`.
- [ ] T014 [P] Add service error classes for not found, not authorized, validation, dependency unavailable, and conflict cases in `apps/api/app/connections/errors.py`.
- [ ] T015 [P] Add redaction helpers that remove passwords, private keys, tokens, raw Vault IDs, and Snowflake connection strings from strings/dicts in `apps/api/app/connections/redaction.py`.
- [ ] T016 [P] Add Supabase Vault adapter protocol and concrete HTTP-backed adapter boundary in `apps/api/app/connections/vault.py`.
- [ ] T017 [P] Add Snowflake connectivity tester protocol and concrete adapter boundary in `apps/api/app/connections/snowflake.py`.
- [ ] T018 Add admin membership resolver helper that reuses Feature 2 tenancy context and denies non-admins with `authz_denied` in `apps/api/app/connections/authz.py`.
- [ ] T019 Add connection service skeleton with constructor-injected repository, Vault adapter, Snowflake tester, and clock in `apps/api/app/connections/service.py`.
- [ ] T020 [P] Add Feature 3 test fixture factories for tenant connection, pending secret, test result, and audit records in `apps/api/tests/factories/data_connections.py`.
- [ ] T021 [P] Add migration tests for Feature 3 tables, enum/check constraints, unique `tenant_id`, FKs, and indexes in `apps/api/tests/test_data_connections_migration.py`.
- [ ] T022 [P] Add unit tests for redaction helpers covering passwords, private keys, Vault IDs, exceptions, and nested dictionaries in `apps/api/tests/unit/test_connection_redaction.py`.
- [ ] T023 [P] Add unit tests for status transition rules including pending-to-active, pending-to-failed, failed-rotation-preserves-effective, and no delete/disable in `apps/api/tests/unit/test_connection_status_transitions.py`.

**Checkpoint**: Foundation ready. Schema, models, schemas, adapters, redaction, repository, service shell, and reusable fixtures exist.

---

## Phase 3: User Story 1 - Create Tenant Data Connection (Priority: P1) MVP

**Goal**: An admin creates or updates the tenant's single Snowflake connection metadata and submits credentials without exposing secrets; non-admins are denied.

**Independent Test**: Sign in as admin, call `GET /workspaces/{workspace_id}/connection` before setup, submit valid metadata and credentials with `PUT /workspaces/{workspace_id}/connection`, verify one tenant connection exists with status `pending_test`, and verify response/logs/audits contain no plaintext credentials or raw Vault secret IDs.

### Tests for User Story 1

- [ ] T024 [P] [US1] Add contract tests for `GET /workspaces/{workspace_id}/connection` 200/401/403 responses in `apps/api/tests/contract/test_data_connection_get_contract.py`.
- [ ] T025 [P] [US1] Add contract tests for `PUT /workspaces/{workspace_id}/connection` 200/201/400/401/403/409 responses in `apps/api/tests/contract/test_data_connection_upsert_contract.py`.
- [ ] T026 [P] [US1] Add integration tests for empty `not_configured` state, admin create, metadata update, one-connection-per-tenant, and non-admin denial in `apps/api/tests/integration/test_data_connection_create.py`.
- [ ] T027 [P] [US1] Add integration tests proving create/update responses and connection rows never contain plaintext credential values outside Vault in `apps/api/tests/integration/test_data_connection_secret_safety.py`.
- [ ] T028 [P] [US1] Add Playwright smoke test for admin setup form, password clearing after submit, and non-admin denial in `apps/web/tests/data-connections.spec.ts`.

### Implementation for User Story 1

- [ ] T029 [US1] Implement `get_connection_metadata` service behavior for empty and existing tenant state in `apps/api/app/connections/service.py`.
- [ ] T030 [US1] Implement `upsert_connection` service behavior that validates admin role, trims metadata, stores submitted credentials as `pending_vault_secret_id`, sets `pending_test`, and writes a create or metadata_update audit in `apps/api/app/connections/service.py`.
- [ ] T031 [US1] Implement Vault `store_secret` call shape for Snowflake credentials with tenant/connection metadata and no logging of secret payloads in `apps/api/app/connections/vault.py`.
- [ ] T032 [US1] Implement repository methods used by create/update: `get_connection_for_tenant`, `create_connection`, `update_connection_metadata`, `set_pending_secret`, and `write_management_audit` in `apps/api/app/connections/repository.py`.
- [ ] T033 [US1] Implement FastAPI `GET /workspaces/{workspace_id}/connection` and `PUT /workspaces/{workspace_id}/connection` routes with normalized errors in `apps/api/app/routes/connections.py`.
- [ ] T034 [US1] Register the connections router in `apps/api/app/main.py`.
- [ ] T035 [P] [US1] Add web API helpers for get/upsert connection metadata in `apps/web/app/lib/connections-api.ts`.
- [ ] T036 [US1] Add server actions for upserting connection metadata and credentials with UUID validation and form error propagation in `apps/web/app/connections/actions.ts`.
- [ ] T037 [US1] Create admin Connections page with empty state, metadata form, credential fields, submit handling, and secret-safe status copy in `apps/web/app/connections/page.tsx`.
- [ ] T038 [US1] Ensure the Connections page denies or redirects non-admin roles using protected `/me` context in `apps/web/app/connections/page.tsx`.

**Checkpoint**: User Story 1 is complete when admins can create/update one tenant connection, non-admins are denied, status is `pending_test` after credential submission, and no secret values appear outside Vault.

---

## Phase 4: User Story 2 - Test and Monitor Connection Health (Priority: P2)

**Goal**: An admin tests the configured or pending connection and sees safe status, timestamps, and categorized sanitized errors.

**Independent Test**: Configure a connection, run `POST /workspaces/{workspace_id}/connection/test` with a fake successful tester and a fake failing tester, verify `active` on success, `test_failed` on failure, timestamps and test records are written, errors are categorized, and no secrets appear in responses/logs/audits.

### Tests for User Story 2

- [ ] T039 [P] [US2] Add contract tests for `POST /workspaces/{workspace_id}/connection/test` success and failure responses in `apps/api/tests/contract/test_data_connection_test_contract.py`.
- [ ] T040 [P] [US2] Add integration tests for successful test activating pending credentials, writing `last_tested_at`, `last_successful_test_at`, and creating test/audit records in `apps/api/tests/integration/test_data_connection_test_success.py`.
- [ ] T041 [P] [US2] Add integration tests for failed test categorizing `credential`, `network`, `permission`, `timeout`, and `unknown` failures without secret exposure in `apps/api/tests/integration/test_data_connection_test_failure.py`.
- [ ] T042 [P] [US2] Add unit tests for Snowflake exception-to-failure-category mapping in `apps/api/tests/unit/test_snowflake_failure_mapping.py`.
- [ ] T043 [P] [US2] Add Playwright smoke test for the Test button, status badge, last tested time, and sanitized error display in `apps/web/tests/data-connections.spec.ts`.

### Implementation for User Story 2

- [ ] T044 [US2] Implement bounded Snowflake connectivity check that uses submitted/effective credentials and returns success or categorized failure in `apps/api/app/connections/snowflake.py`.
- [ ] T045 [US2] Implement `test_connection` service behavior that selects pending credentials when present, promotes pending to effective on success, records test result, and writes a test audit in `apps/api/app/connections/service.py`.
- [ ] T046 [US2] Implement failed-test behavior that sets `test_failed`, stores sanitized `last_error`, writes test result/audit, and does not store raw exceptions in `apps/api/app/connections/service.py`.
- [ ] T047 [US2] Implement repository methods for writing connection test results and updating test status/timestamps in `apps/api/app/connections/repository.py`.
- [ ] T048 [US2] Implement FastAPI `POST /workspaces/{workspace_id}/connection/test` route with `ConnectionTestResponse` in `apps/api/app/routes/connections.py`.
- [ ] T049 [P] [US2] Add web API helper for testing a connection in `apps/web/app/lib/connections-api.ts`.
- [ ] T050 [US2] Add server action for testing the connection and revalidating `/connections` in `apps/web/app/connections/actions.ts`.
- [ ] T051 [US2] Add Test button, status badge, timestamp rendering, and sanitized error panel to `apps/web/app/connections/page.tsx`.

**Checkpoint**: User Story 2 is complete when connection tests activate valid credentials, categorize safe failures, update admin-visible status, and produce no secret leaks.

---

## Phase 5: User Story 3 - Rotate Credentials Safely (Priority: P3)

**Goal**: An admin submits replacement credentials without exposing secrets; the replacement becomes effective only after a successful test, and failed rotation preserves the previous active credential.

**Independent Test**: Start with an active connection, call `POST /workspaces/{workspace_id}/connection/rotate`, verify status `pending_test` and previous effective credential remains in use, run a successful test to promote the pending secret within 60 seconds, then run a failed rotation and verify the old effective credential remains unchanged.

### Tests for User Story 3

- [ ] T052 [P] [US3] Add contract tests for `POST /workspaces/{workspace_id}/connection/rotate` 200/400/401/403/404 responses in `apps/api/tests/contract/test_data_connection_rotate_contract.py`.
- [ ] T053 [P] [US3] Add integration tests for successful rotation submission, pending status, successful promotion after test, secret version increment, and rotate/test audit records in `apps/api/tests/integration/test_data_connection_rotate_success.py`.
- [ ] T054 [P] [US3] Add integration tests for failed rotation preserving `vault_secret_id`, `secret_version`, and downstream effective credential while recording sanitized failure in `apps/api/tests/integration/test_data_connection_rotate_failure.py`.
- [ ] T055 [P] [US3] Add unit tests for connection resolver/cache-holder invalidation using `secret_version` and a 60-second max staleness window in `apps/api/tests/unit/test_connection_resolution_cache.py`.
- [ ] T056 [P] [US3] Add Playwright smoke test for credential rotation form, pending-test copy, success state, and failed-rotation message in `apps/web/tests/data-connections.spec.ts`.

### Implementation for User Story 3

- [ ] T057 [US3] Implement `rotate_credentials` service behavior that stores replacement credentials as pending only, sets `pending_test`, leaves `vault_secret_id` unchanged, and writes a rotate audit in `apps/api/app/connections/service.py`.
- [ ] T058 [US3] Implement successful pending-secret promotion that copies `pending_vault_secret_id` to `vault_secret_id`, increments `secret_version`, clears pending fields, and updates timestamps in `apps/api/app/connections/service.py`.
- [ ] T059 [US3] Implement failed rotation handling that leaves effective secret fields unchanged, keeps or clears pending fields consistently, sets `test_failed`, and stores only sanitized error text in `apps/api/app/connections/service.py`.
- [ ] T060 [US3] Implement repository methods for setting pending rotation fields, promoting pending fields, and preserving effective fields on failure in `apps/api/app/connections/repository.py`.
- [ ] T061 [US3] Implement connection resolver helper that returns effective connection metadata and invalidates in-process holders by `secret_version` within 60 seconds in `apps/api/app/connections/resolver.py`.
- [ ] T062 [US3] Implement FastAPI `POST /workspaces/{workspace_id}/connection/rotate` route in `apps/api/app/routes/connections.py`.
- [ ] T063 [P] [US3] Add web API helper for rotating credentials in `apps/web/app/lib/connections-api.ts`.
- [ ] T064 [US3] Add server action for credential rotation with password field validation and no echoing of submitted values in `apps/web/app/connections/actions.ts`.
- [ ] T065 [US3] Add rotation UI section that explains activation requires a successful test in `apps/web/app/connections/page.tsx`.

**Checkpoint**: User Story 3 is complete when credential rotation is safe, test-gated, secret-free in all responses/logs/audits, and reflected in effective connection resolution within 60 seconds after success.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation, generated artifacts, validation, and security checks across all completed stories.

- [ ] T066 [P] Add contract usage notes and implementation caveats in `specs/003-data-connections/contracts/README.md`.
- [ ] T067 [P] Update quickstart with any final endpoint/status details discovered during implementation in `specs/003-data-connections/quickstart.md`.
- [ ] T068 Regenerate or manually align shared TypeScript connection API types from `specs/003-data-connections/contracts/data-connections.openapi.yaml` into `packages/types/src/data-connections.ts`.
- [ ] T069 [P] Add no-secret regression tests that scan captured API logs for submitted credential values in `apps/api/tests/test_data_connection_no_secret_in_logs.py`.
- [ ] T070 [P] Add API README troubleshooting notes for Vault unavailable, Snowflake timeout, invalid credentials, and permission failure categories in `apps/api/README.md`.
- [ ] T071 Run API validation commands for `apps/api`: `uv run --directory apps/api pytest` and `uv run --directory apps/api ruff check .`.
- [ ] T072 Run web validation commands for `apps/web`: `pnpm --filter @dashboardy/web lint` and `pnpm --filter @dashboardy/web test`.
- [ ] T073 Run Playwright validation for the connections flow: `pnpm --filter @dashboardy/web exec playwright test tests/data-connections.spec.ts`.
- [ ] T074 Run monorepo validation commands from `package.json`: `pnpm lint` and `pnpm test`.
- [ ] T075 Verify every required assertion in `specs/003-data-connections/quickstart.md` manually or with tests and record any follow-up notes in `specs/003-data-connections/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies; can start immediately.
- **Phase 2 Foundational**: Depends on Phase 1 completion; blocks all user stories.
- **Phase 3 US1**: Depends on Phase 2; MVP slice.
- **Phase 4 US2**: Depends on Phase 2 and uses US1 connection metadata/create behavior.
- **Phase 5 US3**: Depends on US1 active connection metadata and US2 test/promote behavior.
- **Phase 6 Polish**: Depends on all desired story phases being complete.

### User Story Dependencies

- **US1 (P1) Create Tenant Data Connection**: No story dependency after Phase 2. This is the MVP.
- **US2 (P2) Test and Monitor Connection Health**: Requires US1 because testing needs a configured or pending connection.
- **US3 (P3) Rotate Credentials Safely**: Requires US1 and US2 because rotation depends on an existing connection and test-gated activation.

### Within Each User Story

- Write contract/integration/unit tests first and confirm they fail for the missing behavior.
- Implement repository methods before service methods.
- Implement service methods before route handlers.
- Implement API behavior before web API helpers, server actions, and UI.
- Complete the checkpoint before moving to the next story.

---

## Parallel Opportunities

- T002, T004, T005, and T006 can run in parallel because they touch separate shared type/documentation files.
- T011, T012, T014, T015, T016, T017, T020, T021, T022, and T023 can run in parallel after T008-T010 define the schema/model direction.
- US1 tests T024-T028 can run in parallel after the contracts and foundational fixtures exist.
- US2 tests T039-T043 can run in parallel after US1 connection fixtures exist.
- US3 tests T052-T056 can run in parallel after US1/US2 fixtures and service interfaces exist.
- Web tasks in each story can run after the corresponding API contract is stable, but should not be merged before API behavior passes.

---

## Parallel Example: User Story 1

```bash
Task: "Add contract tests for GET /workspaces/{workspace_id}/connection in apps/api/tests/contract/test_data_connection_get_contract.py"
Task: "Add contract tests for PUT /workspaces/{workspace_id}/connection in apps/api/tests/contract/test_data_connection_upsert_contract.py"
Task: "Add integration tests for empty state, admin create, one-connection-per-tenant, and non-admin denial in apps/api/tests/integration/test_data_connection_create.py"
Task: "Add Playwright smoke test for admin setup form and non-admin denial in apps/web/tests/data-connections.spec.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Add contract tests for POST /workspaces/{workspace_id}/connection/test in apps/api/tests/contract/test_data_connection_test_contract.py"
Task: "Add integration tests for successful connection test activation in apps/api/tests/integration/test_data_connection_test_success.py"
Task: "Add integration tests for categorized safe failures in apps/api/tests/integration/test_data_connection_test_failure.py"
Task: "Add unit tests for Snowflake exception-to-failure-category mapping in apps/api/tests/unit/test_snowflake_failure_mapping.py"
```

## Parallel Example: User Story 3

```bash
Task: "Add contract tests for POST /workspaces/{workspace_id}/connection/rotate in apps/api/tests/contract/test_data_connection_rotate_contract.py"
Task: "Add integration tests for successful credential rotation in apps/api/tests/integration/test_data_connection_rotate_success.py"
Task: "Add integration tests for failed rotation preserving effective credentials in apps/api/tests/integration/test_data_connection_rotate_failure.py"
Task: "Add unit tests for 60-second connection resolution cache invalidation in apps/api/tests/unit/test_connection_resolution_cache.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Stop and validate: admin can create/update one tenant connection, non-admins are denied, and no secrets leak.
5. Demo the admin connection setup page before adding test and rotation behavior.

### Incremental Delivery

1. Setup + Foundational: schema, adapters, redaction, and service shell.
2. US1: create/update one tenant connection and safe admin metadata page.
3. US2: run connection tests and show safe status/error details.
4. US3: rotate credentials safely using the same test-gated activation path.
5. Polish: run full validation, update docs, and confirm quickstart.

### Implementation Notes For Lower-Cost Models

- Do not add delete or disable endpoints, buttons, schemas, or tasks.
- Do not return `vault_secret_id`, `pending_vault_secret_id`, passwords, private keys, or raw exception text to the web app.
- Do not implement Feature 4 query execution; Snowflake use in this feature is only a bounded connectivity test.
- Keep route handlers thin: resolve admin context, call `connections.service`, map service errors to HTTP responses.
- Prefer dependency-injected Vault and Snowflake adapters so tests can use fakes without real external services.
- Preserve the previous active secret during rotation until the pending secret passes the test endpoint.
- Treat every create, metadata update, test, and rotate attempt as auditable, including failures.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- [Story] labels map tasks to user stories from `spec.md`.
- Tests are intentionally explicit because this feature handles credentials and authorization.
- If a task discovers a design contradiction, stop and update `spec.md`/`plan.md` before continuing.
