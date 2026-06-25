# Tasks: Saved Questions and Collections

**Input**: Design documents from `/specs/005-saved-questions-collections/`  
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/saved-questions.openapi.yaml](contracts/saved-questions.openapi.yaml), [quickstart.md](quickstart.md)

**Tests**: Included because the feature spec defines regression/acceptance coverage for permissions, clone behavior, execution/export audit, parameter validation, lifecycle, and stale-update behavior.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently after the shared foundation is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase because it touches different files and does not depend on incomplete tasks.
- **[Story]**: User-story label (`US1`, `US2`, `US3`, `US4`) used only inside user-story phases.
- Every task includes exact file paths to reduce implementation ambiguity.

## Execution Guardrails for Lower-Cost Models

Use these rules for every task:

1. Read the referenced spec/plan/contract section before editing the file named in the task.
2. Implement only the behavior named in the current task; do not add dashboards, widgets, nested collections, comments, version history, public links, XLSX, or async exports.
3. For backend work, keep all app data access in FastAPI; do not use Supabase app-table clients from Next.js.
4. For every route task, call service-layer methods in `apps/api/app/questions/service.py`; route handlers must not make authorization decisions directly.
5. For every service task, re-check permission at action time using `apps/api/app/questions/authz.py` or `apps/api/app/tenancy/permissions.py`.
6. For every test task, write the test against the behavior named in the task and ensure it fails before implementing the matching service/route/UI task.
7. Do not expose `sql_text`, connection metadata, or collection administration controls to `external_client` responses.
8. Use normalized error codes from T016 exactly: `duplicate_collection_name`, `collection_not_empty`, `stale_update`, `invalid_parameters`, `export_not_permitted`, `question_not_found`, `collection_not_found`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create empty feature locations and shared contract/type scaffolds before writing behavior.

- [X] T001 Create backend questions package with empty `__init__.py`, `authz.py`, `repository.py`, `schemas.py`, `service.py`, `parameters.py`, and `csv_export.py` in `apps/api/app/questions/`
- [X] T002 Create route scaffold file `apps/api/app/routes/questions.py` and add a TODO comment listing collection/question/clone/execute/export route groups from `specs/005-saved-questions-collections/contracts/saved-questions.openapi.yaml`
- [X] T003 Create ORM scaffold file `apps/api/app/models/saved_questions.py` and import it from `apps/api/app/models/__init__.py` so migrations/model metadata can discover it
- [X] T004 Create shared TypeScript contract scaffold `packages/types/src/saved-questions.ts` and export it from `packages/types/src/index.ts`
- [X] T005 [P] Create web API client scaffold `apps/web/app/lib/questions-api.ts` with exported function names for collection/question list/create/update/delete/clone/execute/export matching the OpenAPI operation IDs
- [X] T006 [P] Create web route scaffold folders/files `apps/web/app/collections/page.tsx`, `apps/web/app/collections/loading.tsx`, `apps/web/app/collections/collection-form.tsx`, `apps/web/app/questions/page.tsx`, `apps/web/app/questions/loading.tsx`, `apps/web/app/questions/question-editor.tsx`, `apps/web/app/questions/parameter-editor.tsx`, and `apps/web/app/questions/results-table.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, shared DTOs, permission helpers, parameter validation, and route wiring required by every user story.

**CRITICAL**: No user-story implementation should start until this phase is complete.

Implementation detail for this phase:

- T007-T008 should mirror schemas from `contracts/saved-questions.openapi.yaml`.
- T009 should be pure validation/coercion code with no database calls.
- T010 should define ORM only; do not put repository or service logic in model classes.
- T012 should be reversible or include a forward-fix note if enum migration is not safely reversible.
- T013 should expose small repository functions; do not perform role checks in repository methods.
- T014-T015 should return decisions/reasons, not HTTP responses.
- T017 should register routes only after dependencies and schemas import cleanly.

- [X] T007 Add `GrantPermission` (`view`, `edit`) and `QuestionParameterType` (`string`, `number`, `boolean`, `date`) enums in `apps/api/app/questions/schemas.py`
- [X] T008 Define Pydantic DTOs in `apps/api/app/questions/schemas.py`: `ParameterDefinition`, `CollectionCreateRequest`, `CollectionUpdateRequest`, `CollectionResponse`, `SavedQuestionCreateRequest`, `SavedQuestionUpdateRequest`, `SavedQuestionSummary`, `SavedQuestionInternalDetail`, `SavedQuestionConsumerDetail`, `SavedQuestionCloneRequest`, and `SavedQuestionExecuteRequest`
- [X] T009 Implement scalar parameter-schema validation helpers in `apps/api/app/questions/parameters.py` that reject duplicate names, blank names, unsupported types, missing required runtime values, unknown runtime names, and incompatible `string`/`number`/`boolean`/`date` values
- [X] T010 [P] Add ORM enums and models for `Collection`, `SavedQuestion`, and `QuestionGrant` in `apps/api/app/models/saved_questions.py` with tenant/workspace FKs, soft-delete columns, `updated_at`, and indexes described in `specs/005-saved-questions-collections/data-model.md`
- [X] T011 Update existing `CollectionPermission` in `apps/api/app/models/auth_tenancy.py` from `read`/`write`/`admin` to `view`/`edit`, and update all local references in `apps/api/app/tenancy/permissions.py` and tests to use the new vocabulary
- [X] T012 Create Alembic migration `apps/api/app/db/migrations/versions/0014_saved_questions_collections.py` that creates `collections`, `saved_questions`, `question_grants`, aligns `collection_grants.permission` to `view`/`edit`, adds tenant-aware indexes, and adds safe deferred FKs where practical
- [X] T013 [P] Add repository methods in `apps/api/app/questions/repository.py` for tenant/workspace-scoped collection CRUD, saved question CRUD, active-only list filters, grant lookup, active question count by collection, and stale-update conditional updates
- [X] T014 [P] Add authorization helpers in `apps/api/app/questions/authz.py` for `view`, `edit`, `execute`, `clone`, and `export` decisions using membership role, collection grants, question grants, and external `asset_grants.can_export`
- [X] T015 Extend central permission helpers in `apps/api/app/tenancy/permissions.py` with reusable decisions for internal collection grant access, internal question grant widen-only access, and external-client question asset grants
- [X] T016 Implement normalized question-domain exceptions in `apps/api/app/questions/service.py` or `apps/api/app/questions/schemas.py` for `duplicate_collection_name`, `collection_not_empty`, `stale_update`, `invalid_parameters`, `export_not_permitted`, `question_not_found`, and `collection_not_found`
- [X] T017 Wire `apps/api/app/routes/questions.py` into `apps/api/app/main.py` with workspace-scoped prefix `/workspaces/{workspace_id}` while preserving existing health/auth/connections/query routes
- [X] T018 [P] Add shared TypeScript types in `packages/types/src/saved-questions.ts` matching the OpenAPI schemas, including `GrantPermission`, `ParameterDefinition`, collection DTOs, saved question DTOs, execute request, and normalized error codes

**Checkpoint**: Database schema, DTOs, permission vocabulary, parameter validation, and route skeleton are ready; user stories may start.

---

## Phase 3: User Story 1 - Author organizes and saves reusable questions (Priority: P1) MVP

**Goal**: An authorized internal author can create a flat collection, create/edit/delete saved questions in it, list/detail them, reject duplicate collection names, reject stale updates, and refuse deleting non-empty collections.

**Independent Test**: As an `admin` or `analyst`, create collection "Revenue", create a saved question with scalar parameter schema, see it in the collection-filtered list, open detail including `sql_text`, update it with current `expected_updated_at`, confirm stale update returns conflict, delete the question, then delete the now-empty collection.

### Tests for User Story 1

- [X] T019 [P] [US1] Add contract tests for collection create/list/detail/update/delete responses and errors in `apps/api/tests/contract/test_collections_contract.py` using `specs/005-saved-questions-collections/contracts/saved-questions.openapi.yaml`
- [X] T020 [P] [US1] Add contract tests for saved question create/list/detail/update/delete responses and errors in `apps/api/tests/contract/test_saved_questions_crud_contract.py` using `specs/005-saved-questions-collections/contracts/saved-questions.openapi.yaml`
- [X] T021 [P] [US1] Add unit tests for parameter schema validation in `apps/api/tests/unit/test_saved_question_parameters.py` covering duplicate names, blank names, unsupported types, required flags, and default values for `string`, `number`, `boolean`, and `date`
- [X] T022 [P] [US1] Add integration tests for author collection/question lifecycle in `apps/api/tests/integration/test_saved_questions_authoring.py` covering create, list, detail with `sql_text`, update, soft delete, active-only lists, and historical identifiers retained
- [X] T023 [P] [US1] Add integration tests for duplicate collection names, non-empty collection delete refusal, stale collection/question update refusal, and cache invalidation on saved-question SQL or parameter-schema changes in `apps/api/tests/integration/test_saved_questions_lifecycle_guards.py`

### Implementation for User Story 1

Implementation detail for US1:

- Collection create/update must trim names before validation and uniqueness checks.
- Collection delete must count active `saved_questions` first and return `collection_not_empty` if count > 0.
- Saved-question update must compare `expected_updated_at` to the current row before mutating data.
- Saved-question update must invalidate Feature 4 cache entries when `sql_text` or `parameter_schema` changes.
- Normal lists must exclude rows with `deleted_at IS NOT NULL`.
- Author-facing detail may include `sql_text`; this does not apply to external-client detail in US2.

- [X] T024 [US1] Implement collection service methods in `apps/api/app/questions/service.py`: `list_collections`, `get_collection`, `create_collection`, `update_collection`, and `delete_collection`, including trimmed-name uniqueness, soft delete, non-empty delete refusal, active-only defaults, and stale `expected_updated_at` checks
- [X] T025 [US1] Implement saved question CRUD service methods in `apps/api/app/questions/service.py`: `list_questions`, `get_question`, `create_question`, `update_question`, and `delete_question`, including collection membership validation, scalar parameter schema validation, soft delete, stale `expected_updated_at` checks, and Feature 4 cache invalidation whenever `sql_text` or `parameter_schema` changes
- [X] T026 [US1] Implement collection route handlers in `apps/api/app/routes/questions.py` for `GET/POST /workspaces/{workspace_id}/collections` and `GET/PATCH/DELETE /workspaces/{workspace_id}/collections/{collection_id}` using auth context dependencies and normalized errors
- [X] T027 [US1] Implement saved question CRUD route handlers in `apps/api/app/routes/questions.py` for `GET/POST /workspaces/{workspace_id}/questions` and `GET/PATCH/DELETE /workspaces/{workspace_id}/questions/{question_id}` using internal detail response for authoring roles
- [X] T028 [US1] Implement questions web API client methods in `apps/web/app/lib/questions-api.ts` for collection and saved-question CRUD, including `expected_updated_at` in update payloads and typed normalized error parsing
- [X] T029 [P] [US1] Implement collections page and form UI in `apps/web/app/collections/page.tsx` and `apps/web/app/collections/collection-form.tsx` with list, create, rename/reorder, delete, duplicate-name error, non-empty-delete error, and stale-update error states
- [X] T030 [P] [US1] Implement saved question list/editor UI in `apps/web/app/questions/page.tsx` and `apps/web/app/questions/question-editor.tsx` with collection selector, title, description, SQL text, save, update, delete, and stale-update handling
- [X] T031 [P] [US1] Implement scalar parameter editor in `apps/web/app/questions/parameter-editor.tsx` for adding/removing parameter rows with name, type (`string`, `number`, `boolean`, `date`), required flag, optional label/default, and client-side duplicate-name hints
- [X] T032 [US1] Add navigation links for Collections and Questions in `apps/web/app/admin-luxury-nav.tsx` and `apps/web/app/admin-luxury-nav-client.tsx` visible to `admin`/`analyst` and read-only users where appropriate
- [X] T033 [US1] Run API tests for US1 with `cd apps/api && uv run pytest tests/unit/test_saved_question_parameters.py tests/contract/test_collections_contract.py tests/contract/test_saved_questions_crud_contract.py tests/integration/test_saved_questions_authoring.py tests/integration/test_saved_questions_lifecycle_guards.py`

**Checkpoint**: US1 delivers the MVP authoring loop and can be demoed without US2-US4.

---

## Phase 4: User Story 2 - Permitted users discover and run saved questions (Priority: P2)

**Goal**: Permitted internal users and explicitly granted external clients can discover accessible saved questions, open consumer-safe detail, validate runtime parameters, execute through Feature 4, and receive governed results without connection metadata or external SQL exposure.

**Independent Test**: A viewer with collection `view` access can list/open/run a saved question with valid parameters and cannot edit it; an external client with explicit `asset_grants` can list/open/run the granted question without seeing `sql_text`; invalid runtime parameters fail before warehouse execution.

### Tests for User Story 2

- [X] T034 [P] [US2] Add integration tests for permission-filtered collection/question lists across `admin`, `analyst`, `viewer`, and `external_client` in `apps/api/tests/integration/test_saved_questions_visibility.py`
- [X] T035 [P] [US2] Add integration tests for external-client consumer detail omitting `sql_text`, connection metadata, and collection admin fields in `apps/api/tests/integration/test_saved_questions_external_client.py`
- [X] T036 [P] [US2] Add contract tests for `POST /workspaces/{workspace_id}/questions/{question_id}/execute` success, invalid-parameter errors, and `bypass_cache: true` request handling in `apps/api/tests/contract/test_saved_question_execute_contract.py`
- [X] T037 [P] [US2] Add integration tests for saved-question execute authorization, parameter validation, Feature 4 delegation, and `query_audit_logs.saved_question_id` in `apps/api/tests/integration/test_saved_question_execute.py`

### Implementation for User Story 2

Implementation detail for US2:

- Internal users can inherit `view`/`edit` from collection grants and can gain wider access from `question_grants`.
- External clients must ignore collection/question grants and use only explicit `asset_grants(asset_type='question')`.
- `SavedQuestionConsumerDetail` must omit `sql_text`.
- Runtime parameters must reject unknown keys and missing required keys before query-engine execution.
- Force-fresh execution must pass `bypass_cache: true` to the Feature 4 saved-question execution path.
- Results UI must render `cache_hit` so force-fresh behavior can be verified.

- [X] T038 [US2] Implement effective permission resolution in `apps/api/app/questions/authz.py` so collection `view`/`edit` grants apply to internal members, `question_grants` widen only, and external clients require `asset_grants(asset_type='question')`
- [X] T039 [US2] Update repository list/detail queries in `apps/api/app/questions/repository.py` to return only visible collections/questions for the caller and to omit soft-deleted records by default
- [X] T040 [US2] Update `get_question` service in `apps/api/app/questions/service.py` to return `SavedQuestionInternalDetail` for permitted internal authoring/edit users and `SavedQuestionConsumerDetail` without `sql_text` for viewers/external clients
- [X] T041 [US2] Implement runtime parameter validation in `apps/api/app/questions/parameters.py` that coerces or rejects `string`, `number`, `boolean`, and ISO `date` values before execute/export service calls
- [X] T042 [US2] Implement saved-question execute service method in `apps/api/app/questions/service.py` that loads the question, re-checks execute permission at action time, validates runtime parameters, and calls the Feature 4 query engine with `mode='saved_question'`, `saved_question_id`, `parameters`, and `bypass_cache` so force-fresh runs bypass reusable cached results
- [X] T043 [US2] Implement execute route in `apps/api/app/routes/questions.py` for `POST /workspaces/{workspace_id}/questions/{question_id}/execute`, mapping invalid parameters to 422, authorization failures to 403, missing/hidden questions to 404, and warehouse busy to 429
- [X] T044 [US2] Implement saved-question execute client method in `apps/web/app/lib/questions-api.ts` returning `QueryExecuteSuccessResponse` from `packages/types/src/query-execute.ts` and accepting a `bypass_cache` option for force-fresh runs
- [X] T045 [P] [US2] Implement results table component in `apps/web/app/questions/results-table.tsx` that renders columns, rows, `meta.status`, `duration_ms`, `row_count`, `truncated`, `cache_hit`, empty results, and typed refusal messages
- [X] T046 [US2] Extend `apps/web/app/questions/question-editor.tsx` to support read-only consumer mode, runtime parameter inputs, normal execute button, force-fresh execute button wired to `bypass_cache: true`, execute loading state, invalid-parameter messages, and hidden `sql_text` for external-client responses
- [X] T047 [US2] Run API tests for US2 with `cd apps/api && uv run pytest tests/contract/test_saved_question_execute_contract.py tests/integration/test_saved_questions_visibility.py tests/integration/test_saved_questions_external_client.py tests/integration/test_saved_question_execute.py`

**Checkpoint**: US2 lets permitted users consume and run saved questions safely without authoring access.

---

## Phase 5: User Story 3 - Author clones a question into a target collection (Priority: P3)

**Goal**: An authorized author can clone an accessible saved question into a permitted target collection; the clone has a new identity, the cloner as owner, copied business content, target collection permissions, and no source explicit question grants.

**Independent Test**: An analyst with read access to a source question and create/edit access to a target collection clones the question, sees a new question ID and owner, confirms source unchanged, confirms target collection permissions apply, and confirms source `question_grants` are not copied.

### Tests for User Story 3

- [ ] T048 [P] [US3] Add contract tests for `POST /workspaces/{workspace_id}/questions/{question_id}/clone` success, forbidden target collection, and missing source in `apps/api/tests/contract/test_saved_question_clone_contract.py`
- [ ] T049 [P] [US3] Add integration tests for clone ownership, copied content, unchanged source, target collection permissions, and no copied source question grants in `apps/api/tests/integration/test_saved_question_clone.py`

### Implementation for User Story 3

Implementation detail for US3:

- Clone must create a new `saved_questions.id`.
- Clone must set `created_by_membership_id` to the cloner.
- Clone must copy `title`, `description`, `sql_text`, and `parameter_schema`, unless the request supplies an override title.
- Clone must not copy any source `question_grants`.
- Clone effective permissions come from the target collection plus any future grants added to the clone.

- [ ] T050 [US3] Add repository clone helper in `apps/api/app/questions/repository.py` that inserts a new `saved_questions` row with copied title/description/sql_text/parameter_schema, target collection, cloner membership IDs, and no copied `question_grants`
- [ ] T051 [US3] Implement clone service method in `apps/api/app/questions/service.py` that re-checks source `view` permission, target collection `edit` permission, target collection active state, optional override title validation, and returns internal detail for the clone
- [ ] T052 [US3] Implement clone route in `apps/api/app/routes/questions.py` for `POST /workspaces/{workspace_id}/questions/{question_id}/clone` with 201 success, 403 for missing source/target permission, and 404 for hidden source/target collection
- [ ] T053 [US3] Implement clone client method in `apps/web/app/lib/questions-api.ts` and add clone action UI to `apps/web/app/questions/question-editor.tsx` with target collection selector, optional title override, success navigation, and forbidden-target error
- [ ] T054 [US3] Run clone tests with `cd apps/api && uv run pytest tests/contract/test_saved_question_clone_contract.py tests/integration/test_saved_question_clone.py`

**Checkpoint**: US3 supports safe reuse-by-cloning without permission leakage.

---

## Phase 6: User Story 4 - Authorized users export saved question results as CSV (Priority: P4)

**Goal**: A user with separate export permission can synchronously export saved-question results as CSV using the same authorization, parameter validation, execution path, row cap, and audit behavior as on-screen execution.

**Independent Test**: A permitted user exports a saved question and receives `text/csv` with headers and at most 10,000 rows; an external client without `can_export` receives 403; invalid parameters or execution refusal returns a normalized error and no CSV.

### Tests for User Story 4

- [ ] T055 [P] [US4] Add contract tests for `GET /workspaces/{workspace_id}/questions/{question_id}/export.csv` success, forbidden export, invalid parameters, and `parameters[name]=value` deep-object query serialization in `apps/api/tests/contract/test_saved_question_export_contract.py`
- [ ] T056 [P] [US4] Add unit tests for CSV rendering with headers, zero rows, escaping, null cells, and 10,000-row cap in `apps/api/tests/unit/test_saved_question_csv_export.py`
- [ ] T057 [P] [US4] Add integration tests for export permission covering internal `admin`/`analyst`/`viewer` visible-question export, external `can_export=false`, external `can_export=true`, shared execution/audit path, and no CSV on invalid parameters in `apps/api/tests/integration/test_saved_question_export.py`

### Implementation for User Story 4

Implementation detail for US4:

- Internal `admin`, `analyst`, and `viewer` may export visible saved questions within CSV limits.
- External clients require `asset_grants.can_export = true`.
- CSV export parameters use deep-object query serialization: `parameters[name]=value`.
- Export must reuse the saved-question execution path; do not create a second Snowflake dispatch path.
- If execution returns a refusal outcome, return normalized JSON error instead of CSV.
- CSV output must include headers even for zero rows and must never exceed 10,000 data rows.

- [ ] T058 [US4] Implement CSV rendering helper in `apps/api/app/questions/csv_export.py` that accepts query-engine columns/rows, writes RFC-compatible CSV with headers, escapes cells, preserves zero-row headers, and enforces the 10,000-row hard cap
- [ ] T059 [US4] Implement export service method in `apps/api/app/questions/service.py` that re-checks separate export permission, validates runtime parameters, delegates to saved-question execution path, converts successful results to CSV, and converts execution refusals to normalized JSON errors
- [ ] T060 [US4] Implement export route in `apps/api/app/routes/questions.py` for `GET /workspaces/{workspace_id}/questions/{question_id}/export.csv`, reading scalar parameters from `parameters[name]=value` deep-object query string plus `bypass_cache`, returning `text/csv`, and returning 403/404/422 JSON errors when CSV is not produced
- [ ] T061 [US4] Implement export client method in `apps/web/app/lib/questions-api.ts` that downloads CSV blobs and preserves normalized JSON error handling for non-200 responses
- [ ] T062 [US4] Add export button and export error/loading states to `apps/web/app/questions/question-editor.tsx`, visible when an internal `admin`/`analyst`/`viewer` can see the saved question or when an external-client response has `can_export: true`
- [ ] T063 [US4] Run export tests with `cd apps/api && uv run pytest tests/unit/test_saved_question_csv_export.py tests/contract/test_saved_question_export_contract.py tests/integration/test_saved_question_export.py`

**Checkpoint**: US4 completes controlled CSV export without async jobs or non-CSV formats.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification, docs, generated types, and regression checks across all completed stories.

- [ ] T064 [P] Update `packages/types/src/saved-questions.ts` and `packages/types/src/index.ts` after implementation so exported types exactly match `specs/005-saved-questions-collections/contracts/saved-questions.openapi.yaml`
- [ ] T065 [P] Add or update UI loading skeletons in `apps/web/app/collections/loading.tsx` and `apps/web/app/questions/loading.tsx` for collection/question lists and detail editor loading states
- [ ] T066 [P] Add Playwright smoke test for authoring loop in `apps/web/tests/saved-questions.spec.ts` covering create collection, create question, normal run, force-fresh run, clone, export-button visibility, and timing assertion that the authoring loop completes in under 3 minutes with mocked or test API data
- [ ] T067 Add Feature 5 quickstart validation notes to `specs/005-saved-questions-collections/quickstart.md` if implementation discovers required env or fixture setup not already documented
- [ ] T068 Run full API regression for Feature 5 with `cd apps/api && uv run pytest tests/unit tests/contract tests/integration`
- [ ] T069 Run web validation for Feature 5 with `cd apps/web && pnpm lint && pnpm test` or the nearest existing web lint/test commands in `apps/web/package.json`
- [ ] T070 Verify no Feature 5 implementation exposes `sql_text`, connection metadata, or collection admin actions to external-client responses by reviewing `apps/api/app/questions/schemas.py`, `apps/api/app/questions/service.py`, and `apps/api/tests/integration/test_saved_questions_external_client.py`
- [ ] T071 Verify Feature 5 scope boundaries remain intact by checking no dashboard/widget/nested collection/comment/version-history/public-link/XLSX/async-export files or routes were added outside `apps/api/app/questions/`, `apps/api/app/routes/questions.py`, and `apps/web/app/collections/` / `apps/web/app/questions/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **US1 Authoring MVP (Phase 3)**: Depends on Foundational; recommended MVP scope.
- **US2 Discovery and Execute (Phase 4)**: Depends on Foundational and benefits from US1 data creation paths; can be developed with fixtures if US1 is incomplete.
- **US3 Clone (Phase 5)**: Depends on Foundational and saved-question repository/service from US1.
- **US4 Export (Phase 6)**: Depends on Foundational and saved-question execute path from US2.
- **Polish (Phase 7)**: Depends on all targeted user stories.

### User Story Dependencies

- **US1 (P1)**: Independent MVP after Foundational.
- **US2 (P2)**: Independently testable with seeded collections/questions; production flow depends on US1-created data.
- **US3 (P3)**: Independently testable with seeded source/target collections/questions; production flow depends on US1.
- **US4 (P4)**: Independently testable with seeded saved questions and mocked query-engine output; production flow depends on US2 execution orchestration.

### Within Each User Story

- Tests first, then service/repository changes, then routes, then web/API client integration, then story-specific validation command.
- Backend API behavior should be complete before wiring the corresponding web UI.
- Route handlers must never bypass `apps/api/app/questions/service.py` authorization checks.

---

## Parallel Opportunities

- T005 and T006 can run in parallel after T001-T004 are started because they touch web files only.
- T010, T013, T014, and T018 can run in parallel after DTO names are agreed in T007-T008, because they touch separate model/repository/authz/type files.
- US1 tests T019-T023 can be written in parallel before US1 implementation.
- US2 tests T034-T037 can be written in parallel before US2 implementation.
- US3 tests T048-T049 can be written in parallel before US3 implementation.
- US4 tests T055-T057 can be written in parallel before US4 implementation.
- Web components T029, T030, and T031 can be developed in parallel after API client method signatures in T028 exist.
- Polish tasks T064-T066 can run in parallel once the relevant stories are implemented.

---

## Parallel Example: User Story 1

```bash
# Parallel test-writing prompts
Task: "Add contract tests for collection endpoints in apps/api/tests/contract/test_collections_contract.py"
Task: "Add contract tests for saved question CRUD endpoints in apps/api/tests/contract/test_saved_questions_crud_contract.py"
Task: "Add unit tests for parameter schema validation in apps/api/tests/unit/test_saved_question_parameters.py"
Task: "Add integration tests for author lifecycle in apps/api/tests/integration/test_saved_questions_authoring.py"
Task: "Add integration tests for lifecycle guards in apps/api/tests/integration/test_saved_questions_lifecycle_guards.py"

# Parallel UI prompts after API client exists
Task: "Implement collections page and form in apps/web/app/collections/page.tsx and apps/web/app/collections/collection-form.tsx"
Task: "Implement saved question editor in apps/web/app/questions/question-editor.tsx"
Task: "Implement scalar parameter editor in apps/web/app/questions/parameter-editor.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "Add visibility integration tests in apps/api/tests/integration/test_saved_questions_visibility.py"
Task: "Add external-client detail tests in apps/api/tests/integration/test_saved_questions_external_client.py"
Task: "Add execute contract tests in apps/api/tests/contract/test_saved_question_execute_contract.py"
Task: "Add execute integration tests in apps/api/tests/integration/test_saved_question_execute.py"
```

## Parallel Example: User Story 4

```bash
Task: "Add CSV renderer unit tests in apps/api/tests/unit/test_saved_question_csv_export.py"
Task: "Add export contract tests in apps/api/tests/contract/test_saved_question_export_contract.py"
Task: "Add export integration tests in apps/api/tests/integration/test_saved_question_export.py"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete US1 tasks T019-T033.
3. Validate the independent authoring loop: create collection, create question, list/detail, update, stale conflict, soft delete question, delete empty collection.
4. Stop and demo before adding execution, clone, or export.

### Incremental Delivery

1. Add US1 for author-managed collections and saved questions.
2. Add US2 for permission-filtered discovery and governed execution.
3. Add US3 for safe clone/reuse.
4. Add US4 for controlled CSV export.
5. Finish polish and full regression.

### Notes for Lower-Cost Implementers

- Do not introduce dashboards, widgets, nested collections, comments, version history, public links, XLSX, or async export jobs.
- Do not read or write Supabase app tables from Next.js; all app data operations go through FastAPI.
- Do not expose `sql_text` or connection metadata to `external_client` responses.
- Do not copy source `question_grants` during clone.
- Do not allow collection deletion while active saved questions remain.
- Do not use last-write-wins for collection/question updates; require `expected_updated_at` and return `stale_update` on mismatch.
- Keep `view`/`edit` grants separate from export permission.
- Reuse Feature 4 query execution for saved-question execute/export; do not create a second Snowflake execution path in `apps/api/app/questions/`.
