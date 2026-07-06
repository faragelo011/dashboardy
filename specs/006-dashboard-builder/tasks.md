# Tasks: Dashboard Builder

**Input**: Design documents from `/specs/006-dashboard-builder/`  
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/dashboards.openapi.yaml](contracts/dashboards.openapi.yaml), [quickstart.md](quickstart.md)

**Tests**: Included because the feature spec defines measurable acceptance coverage for permissions, filters, overrides, cache correctness, clone behavior, CSV export, and stale-update behavior.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently after the shared foundation is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase because it touches different files and does not depend on incomplete tasks.
- **[Story]**: User-story label (`US1`–`US5`) used only inside user-story phases.
- Every task includes exact file paths and concrete behavior to reduce ambiguity for lower-cost implementers.

## Execution Guardrails for Lower-Cost Models

Read this block before every task:

1. Read the cited section in `specs/006-dashboard-builder/spec.md`, `plan.md`, or `contracts/dashboards.openapi.yaml` before editing the named file.
2. Implement **only** the behavior in the current task. Do **not** add pie/area/scatter/funnel widgets, widget-local-only filters, nested collections, comments, version history, public links, async export, or new saved-question authoring.
3. All app database reads/writes stay in FastAPI (`apps/api`). Next.js must call the API only — never Supabase app-table clients.
4. Route handlers in `apps/api/app/routes/dashboards.py` call `apps/api/app/dashboards/service.py` only. Routes must not perform authorization logic directly.
5. Authorization decisions live in `apps/api/app/dashboards/authz.py` and `apps/api/app/tenancy/permissions.py`. Re-check permission at action time for list/detail/update/delete/clone/execute/export.
6. Widget warehouse execution must delegate to the existing Feature 4 query engine with `mode='widget'`. Do **not** create a second Snowflake execution path in `apps/api/app/dashboards/`.
7. Filter merge and `filter_state_hash` live in `apps/api/app/dashboards/filters.py`. Use `apps/api/app/questions/parameters.py` for runtime scalar validation after merge.
8. Never return `sql_text`, raw SQL, or connection metadata in dashboard/widget responses for `viewer` or `external_client` roles.
9. Use normalized error codes from T016 exactly: `duplicate_dashboard_title`, `dashboard_not_found`, `widget_not_found`, `stale_update`, `invalid_filter_bindings`, `widget_local_filter_forbidden` (reject override keys that are not declared global filters — widget-local-only filters are out of scope), `invalid_parameters`, `export_not_permitted`, `collection_not_empty`, `unsupported_widget_type`.
10. `dashboard_grants` widen-only rows have no public CRUD API in Feature 6 (same as Feature 5 `question_grants`); seed grants in integration tests via repository helpers or SQL fixtures.
11. When a task says "run tests", run only the pytest command in that task — do not skip to later phases.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create empty feature locations and shared contract/type scaffolds before writing behavior.

- [X] T001 Create backend dashboards package with empty module files `__init__.py`, `authz.py`, `repository.py`, `schemas.py`, `service.py`, `filters.py`, `clone.py`, and `csv_export.py` in `apps/api/app/dashboards/`
- [X] T002 Create route scaffold `apps/api/app/routes/dashboards.py` with a top-of-file comment listing route groups from `specs/006-dashboard-builder/contracts/dashboards.openapi.yaml`: list/create dashboard, get/patch/delete dashboard, clone, widget execute, table export
- [X] T003 Create ORM scaffold `apps/api/app/models/dashboards.py` and import it from `apps/api/app/models/__init__.py` so Alembic metadata discovers dashboard models
- [X] T004 Create shared TypeScript contract scaffold `packages/types/src/dashboards.ts` with exported placeholder types `DashboardSummary`, `DashboardDetail`, `DashboardWidget`, `GlobalFilter`, and `WidgetExecuteResponse`
- [X] T005 [P] Create web API client scaffold `apps/web/app/lib/dashboards-api.ts` with exported function name stubs matching OpenAPI operation IDs: `listDashboards`, `createDashboard`, `getDashboard`, `updateDashboard`, `deleteDashboard`, `cloneDashboard`, `executeDashboardWidget`, `exportDashboardWidgetCsv`
- [X] T006 [P] Create web route scaffold files `apps/web/app/dashboards/page.tsx`, `apps/web/app/dashboards/loading.tsx`, `apps/web/app/dashboards/[dashboardId]/page.tsx`, `apps/web/app/dashboards/[dashboardId]/edit/page.tsx`, `apps/web/app/dashboards/[dashboardId]/dashboard-filter-bar.tsx`, `apps/web/app/dashboards/[dashboardId]/dashboard-grid.tsx`, and widget component stubs under `apps/web/app/dashboards/[dashboardId]/widgets/` (`kpi-widget.tsx`, `bar-widget.tsx`, `line-widget.tsx`, `table-widget.tsx`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, shared DTOs, permission helpers, filter-merge utilities, and route wiring required by every user story.

**CRITICAL**: No user-story implementation should start until this phase is complete.

Implementation notes for this phase:

- T007–T008 must mirror `specs/006-dashboard-builder/contracts/dashboards.openapi.yaml`.
- T009 `filters.py` is pure merge/hash code with no database or HTTP calls.
- T010 defines ORM only — no repository or service logic in model classes.
- T012 migration revision id must be `0015_dashboards` (next after `0014_saved_questions_collections.py`).
- T013 repository methods must not perform role checks.
- T014–T015 return permission decisions/reasons, not HTTP responses.
- T017 registers routes in `apps/api/app/main.py` without breaking existing routes.
- T018–T022 must complete before any US1 widget execute work; widget mode is currently blocked in the query engine.

- [X] T007 Add enums in `apps/api/app/dashboards/schemas.py`: `WidgetType` (`kpi`, `bar`, `line`, `table`), `GlobalFilterValueType` (`string`, `number`, `boolean`, `date`), and `GrantPermission` (`view`, `edit`) for dashboard grants
- [X] T008 Define Pydantic DTOs in `apps/api/app/dashboards/schemas.py`: `GlobalFilter`, `DashboardDefinition`, `WidgetLayout`, `DashboardWidget`, `DashboardSummary`, `DashboardDetail`, `DashboardCreateRequest`, `DashboardUpdateRequest`, `DashboardCloneRequest`, `WidgetExecuteRequest`, `WidgetExecuteResponse`, and `DashboardConsumerDetail` (same as detail but without any SQL fields)
- [X] T009 Implement filter helpers in `apps/api/app/dashboards/filters.py`: `merge_widget_parameters(global_filters, global_filter_values, widget_bindings, filter_overrides) -> dict`, `compute_filter_state_hash(...) -> str`, and `validate_bindings_reference_global_filters(...)` that rejects unknown global filter ids and widget-local-only filter keys
- [X] T010 [P] Add ORM models `Dashboard`, `DashboardWidget`, and `DashboardGrant` in `apps/api/app/models/dashboards.py` with tenant/workspace FKs, soft-delete columns, JSONB columns per `specs/006-dashboard-builder/data-model.md`, and indexes including unique active `(collection_id, lower(trim(title)))`
- [X] T011 [P] Extend `apps/api/app/questions/repository.py` with `count_active_dashboards_by_collection(collection_id) -> int` used to refuse collection delete when dashboards remain (return count to questions service or expose via shared repo helper)
- [X] T012 Create Alembic migration `apps/api/app/db/migrations/versions/0015_dashboards.py` creating `dashboards`, `dashboard_widgets`, and `dashboard_grants` tables with constraints and indexes from `specs/006-dashboard-builder/data-model.md`
- [X] T013 [P] Add repository methods in `apps/api/app/dashboards/repository.py` for tenant/workspace-scoped dashboard CRUD, widget upsert/delete by dashboard, active-only list filters, dashboard grant lookup, stale-update conditional updates, and load dashboard with widgets
- [X] T014 [P] Add authorization helpers in `apps/api/app/dashboards/authz.py` for `view`, `edit`, `execute`, `clone`, and `export` using membership role, collection grants, dashboard grants (`view`/`edit` widen only), and external `asset_grants(asset_type='dashboard', can_export)`
- [X] T015 Extend `apps/api/app/tenancy/permissions.py` with reusable helpers `resolve_internal_dashboard_grant_access(...)` and `can_export_dashboard(...)` mirroring saved-question export rules from Feature 5
- [X] T016 Implement normalized dashboard-domain exceptions/error codes in `apps/api/app/dashboards/service.py` for `duplicate_dashboard_title`, `dashboard_not_found`, `widget_not_found`, `stale_update`, `invalid_filter_bindings`, `widget_local_filter_forbidden`, `invalid_parameters`, `export_not_permitted`, `collection_not_empty`, and `unsupported_widget_type`
- [X] T017 Wire `apps/api/app/routes/dashboards.py` into `apps/api/app/main.py` under prefix `/workspaces/{workspace_id}` while preserving existing health/auth/connections/query/questions routes
- [X] T018 Extend `execute_workspace_query` in `apps/api/app/query_engine/pipeline.py` with `allow_widget_execution: bool = False` (mirror `allow_saved_question_execution`); when True, accept `WidgetQueryExecuteRequest`, populate audit `dashboard_id`/`widget_id`, and include `filter_state_hash` in cache identity
- [X] T019 Update `apps/api/app/query_engine/authz_modalities.py` and `execute_workspace_query` so `mode='widget'` is permitted when `allow_widget_execution=True` from the dashboards service; keep public `POST /query/execute` blocked for widget mode without dashboard authz
- [X] T020 Implement widget SQL resolution in `apps/api/app/query_engine/modal_sql_resolve.py` for `WidgetQueryExecuteRequest`: load active saved question by `saved_question_id` and return `(sql_text, parameters)`; raise a domain error (`question_not_found` or `widget_configuration_invalid`) when the saved question is missing — do not return `None` and defer failure downstream
- [X] T021 Add `widget_type_to_presentation_class(widget_type: str) -> PresentationClass` and `clamp_widget_ttl_seconds(widget_config, presentation_class)` in `apps/api/app/dashboards/schemas.py` mapping `kpi`→`kpi`, `bar`/`line`→`chart`, `table`→`table` for FR-029 TTL lowering
- [X] T022 [P] Add initial shared TypeScript types in `packages/types/src/dashboards.ts` aligned with OpenAPI schemas and export them from `packages/types/src/index.ts` (scaffold pass; T080 verifies exact contract match)

**Checkpoint**: Schema, DTOs, filter merge utilities, permissions, query-engine widget path, and route skeleton are ready. User stories may start.

---

## Phase 3: User Story 1 - Analyst assembles a dashboard from saved questions (Priority: P1) MVP

**Goal**: An authorized analyst can create a dashboard in a collection, add KPI/bar/line/table widgets backed by saved questions, save layout, reopen it, and see widgets render governed results. Duplicate dashboard titles within the same collection are rejected.

**Independent Test**: As `admin` or `analyst`, create dashboard "Revenue Overview" in a collection, add a KPI widget linked to an accessible saved question, save, reopen detail, execute the widget with default/empty global filters, and see results without exposing `sql_text` to viewers.

### Tests for User Story 1

- [X] T023 [P] [US1] Add contract tests for dashboard list/create/get/patch/delete in `apps/api/tests/contract/test_dashboards_crud_contract.py` using `specs/006-dashboard-builder/contracts/dashboards.openapi.yaml`
- [X] T024 [P] [US1] Add integration tests for dashboard authoring lifecycle in `apps/api/tests/integration/test_dashboards_authoring.py` covering create, list, detail with widgets, update layout/widgets, soft delete, active-only lists, and no `sql_text` in consumer-shaped detail responses
- [X] T025 [P] [US1] Add integration tests for duplicate dashboard title within collection (409) and same title allowed in different collections in `apps/api/tests/integration/test_dashboards_title_uniqueness.py`
- [X] T026 [P] [US1] Add integration test in `apps/api/tests/integration/test_dashboard_widget_audit.py` asserting `query_audit_logs.dashboard_id`, `widget_id`, and `saved_question_id` on successful widget execute (SC-008)
- [X] T027 [P] [US1] Add integration tests for stale dashboard update refusal in `apps/api/tests/integration/test_dashboards_stale_update.py`

### Implementation for User Story 1

Implementation notes for US1:

- Dashboard create/update must trim titles before uniqueness checks.
- `definition.global_filters` may be an empty array in US1; widgets may have empty `filter_bindings`/`filter_overrides`.
- Widget `saved_question_id` must reference a question the actor can access at configure time.
- Normal lists exclude `deleted_at IS NOT NULL`.
- PATCH must compare request `updated_at` to current row; mismatch returns `stale_update`.
- Author-facing detail may include `saved_question_id`; never include `sql_text` from the linked question.

- [X] T028 [US1] Implement dashboard service methods in `apps/api/app/dashboards/service.py`: `list_dashboards`, `get_dashboard`, `create_dashboard`, `update_dashboard`, and `delete_dashboard` including trimmed-title uniqueness per collection, widget upsert validation (`widget_type` enum, saved question access check), soft delete, stale `updated_at` checks, and `can_edit` flag on detail
- [X] T029 [US1] Implement dashboard CRUD route handlers in `apps/api/app/routes/dashboards.py` for `GET/POST /workspaces/{workspace_id}/dashboards` and `GET/PATCH/DELETE /workspaces/{workspace_id}/dashboards/{dashboard_id}` mapping errors to 400/403/404/409 per contract
- [X] T030 [US1] Implement basic widget execute service method `execute_widget` in `apps/api/app/dashboards/service.py` that loads dashboard+widget, checks execute permission, calls `merge_widget_parameters` with empty or default global values, validates parameters via `apps/api/app/questions/parameters.py`, builds `WidgetQueryExecuteRequest`, and calls `execute_workspace_query(..., allow_widget_execution=True)` with `dashboard_id`, `widget_id`, `saved_question_id`, merged `parameters`, `filter_state_hash`, `presentation_class` from T021, and clamped TTL from widget `config`
- [X] T031 [US1] Implement widget execute route in `apps/api/app/routes/dashboards.py` for `POST /workspaces/{workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/execute` returning `WidgetExecuteResponse` and mapping invalid parameters to 422, auth failures to 403, missing resources to 404, warehouse busy to 429
- [X] T032 [US1] Implement dashboards web API client methods in `apps/web/app/lib/dashboards-api.ts` for dashboard CRUD and widget execute, including `updated_at` on PATCH payloads and typed normalized errors
- [X] T033 [P] [US1] Implement dashboard list page in `apps/web/app/dashboards/page.tsx` with collection filter, create button, permission-filtered list, and links to viewer (`/dashboards/[id]`) and builder (`/dashboards/[id]/edit`)
- [X] T034 [P] [US1] Implement builder page shell in `apps/web/app/dashboards/[dashboardId]/edit/page.tsx` with title edit, collection selector, save button, stale-update error display, and navigation back to list
- [X] T035 [P] [US1] Implement `apps/web/app/dashboards/[dashboardId]/dashboard-grid.tsx` with add-widget flow (pick saved question + widget type), drag/resize layout persisted as `layout {x,y,w,h}`, and remove-widget action
- [X] T036 [P] [US1] Implement widget render stubs in `apps/web/app/dashboards/[dashboardId]/widgets/kpi-widget.tsx`, `bar-widget.tsx`, `line-widget.tsx`, and `table-widget.tsx` that call `executeDashboardWidget` on mount and show loading/error/empty states (use Recharts only where type is bar/line; KPI shows single scalar; table renders rows)
- [X] T037 [US1] Implement viewer page `apps/web/app/dashboards/[dashboardId]/page.tsx` that loads dashboard detail read-only when user lacks edit and renders `dashboard-grid` in view mode without builder controls
- [X] T038 [US1] Add navigation link `{ href: "/dashboards", label: "Dashboards" }` to `apps/web/app/admin-luxury-nav-client.tsx` visible to internal members with dashboard access and wire `showDashboards` prop from layout if needed in `apps/web/app/layout.tsx`
- [X] T039 [US1] Run US1 API tests with `cd apps/api && uv run pytest tests/contract/test_dashboards_crud_contract.py tests/integration/test_dashboards_authoring.py tests/integration/test_dashboards_title_uniqueness.py tests/integration/test_dashboards_stale_update.py tests/integration/test_dashboard_widget_audit.py`

**Checkpoint**: US1 MVP — analyst can build a dashboard with widgets and see governed results. Demo before adding global filters.

---

## Phase 4: User Story 2 - Dashboard-global filters drive widget results (Priority: P2)

**Goal**: Analyst configures dashboard-global filters; consumers change filter values; bound widgets auto-refresh immediately; unbound widgets ignore unrelated filters; cache does not reuse prior filter state.

**Independent Test**: Add global filter `gf_date` with default; bind one widget's `as_of_date` parameter; change filter value in UI; bound widget re-executes automatically; unbound widget does not re-execute.

### Tests for User Story 2

- [ ] T040 [P] [US2] Add unit tests for `apps/api/app/dashboards/filters.py` in `apps/api/tests/unit/test_dashboard_filters.py` covering merge with bindings, ignored unbound globals, override precedence (stub for US3), and stable `filter_state_hash` changes when values change
- [ ] T041 [P] [US2] Add contract tests for widget execute request/response with `global_filter_values` in `apps/api/tests/contract/test_dashboard_widget_execute_contract.py`
- [ ] T042 [P] [US2] Add integration tests in `apps/api/tests/integration/test_dashboard_filter_refresh.py` proving bound widget execute uses merged parameters, unbound widgets ignore unrelated global filters, and second execute with different `global_filter_values` changes `filter_state_hash` and does not return stale cache when filter state differs

### Implementation for User Story 2

Implementation notes for US2:

- `definition.global_filters[]` stores `id`, `label`, `value_type`, `default_value` only — never viewer-derived defaults.
- `filter_bindings` maps `global_filter_id` → saved-question parameter name per widget.
- Execute must reject bindings pointing to non-existent global filter ids (`invalid_filter_bindings`).
- Execute must reject parameters not declared on the linked saved question (`invalid_parameters`).
- Web filter bar initializes from `default_value` on first load.

- [ ] T043 [US2] Extend `create_dashboard`/`update_dashboard` in `apps/api/app/dashboards/service.py` to validate `definition.global_filters` (unique ids, supported value types, non-empty labels) and widget `filter_bindings` keys against global filter ids
- [ ] T044 [US2] Update `execute_widget` in `apps/api/app/dashboards/service.py` to require `WidgetExecuteRequest.global_filter_values`, merge through `filters.py`, pass resulting `filter_state_hash` to query engine, and invalidate/bypass cache per `bypass_cache` flag
- [ ] T045 [US2] Implement `apps/web/app/dashboards/[dashboardId]/dashboard-filter-bar.tsx` rendering inputs for each global filter by `value_type` and holding current values in React state (Zustand store optional in `apps/web/app/dashboards/[dashboardId]/dashboard-filter-state.ts`)
- [ ] T046 [US2] Update `apps/web/app/dashboards/[dashboardId]/page.tsx` and `edit/page.tsx` to render `dashboard-filter-bar` above the grid and pass `global_filter_values` into widget components
- [ ] T047 [US2] Update widget components in `apps/web/app/dashboards/[dashboardId]/widgets/*.tsx` to accept `globalFilterValues` prop and re-call `executeDashboardWidget` immediately when a bound global filter value changes (auto-refresh per clarification); widgets without a binding for the changed filter must not execute
- [ ] T048 [US2] Add builder UI in `apps/web/app/dashboards/[dashboardId]/edit/page.tsx` to add/edit/remove global filters and configure per-widget `filter_bindings` dropdowns mapping global filter id → saved-question parameter names from the linked question schema
- [ ] T049 [US2] Add shared `apps/web/app/dashboards/[dashboardId]/widgets/widget-chrome.tsx` with per-widget Refresh (current filters) and Force fresh (`bypass_cache: true`) controls; display `meta.cache_hit` after run (FR-019)
- [ ] T050 [US2] Wrap each widget component with `widget-chrome.tsx` in `apps/web/app/dashboards/[dashboardId]/widgets/*.tsx`
- [ ] T051 [US2] Run US2 tests with `cd apps/api && uv run pytest tests/unit/test_dashboard_filters.py tests/contract/test_dashboard_widget_execute_contract.py tests/integration/test_dashboard_filter_refresh.py`

**Checkpoint**: US2 delivers global filters with correct binding semantics and auto-refresh.

---

## Phase 5: User Story 3 - Per-widget filter overrides remain visible (Priority: P3)

**Goal**: Analyst sets per-widget overrides of global filters; consumers see a visible override indicator; execution uses override values instead of current global values for that widget only.

**Independent Test**: Set override on one widget for `gf_date`; viewer sees indicator on that widget; execute uses override value; removing override returns widget to global value.

### Tests for User Story 3

- [ ] T052 [P] [US3] Add unit tests in `apps/api/tests/unit/test_dashboard_filters.py` (extend file) for override precedence: override beats global value for the same `global_filter_id`, and `filter_state_hash` differs when override changes
- [ ] T053 [P] [US3] Add integration tests in `apps/api/tests/integration/test_dashboard_filter_overrides.py` covering visible `has_active_overrides` in API detail, execution with override values, and refusal when override keys are not declared global filters (`widget_local_filter_forbidden`)

### Implementation for User Story 3

Implementation notes for US3:

- `filter_overrides` keys must be subset of `definition.global_filters[].id`.
- API detail must set `has_active_overrides=true` when any override value differs from current global filter value.
- Widget chrome must show indicator text/badge when `has_active_overrides` is true — hidden overrides are forbidden.
- Builder must not allow adding override keys that are not global filters.

- [ ] T054 [US3] Extend `filters.py` and `execute_widget` in `apps/api/app/dashboards/service.py` so overrides replace global values per widget before parameter validation and hash computation
- [ ] T055 [US3] Extend dashboard detail DTO assembly in `apps/api/app/dashboards/service.py` to compute `has_active_overrides` per widget by comparing `filter_overrides` to current global filter values
- [ ] T056 [US3] Add override editor UI to `apps/web/app/dashboards/[dashboardId]/edit/page.tsx` per widget (select global filter + override value) and persist in `filter_overrides` on save
- [ ] T057 [P] [US3] Update all widget components in `apps/web/app/dashboards/[dashboardId]/widgets/*.tsx` to render a visible "Filter override active" indicator when `has_active_overrides` is true
- [ ] T058 [US3] Run US3 tests with `cd apps/api && uv run pytest tests/unit/test_dashboard_filters.py tests/integration/test_dashboard_filter_overrides.py`

**Checkpoint**: US3 delivers visible, executable per-widget overrides without widget-local-only filters.

---

## Phase 6: User Story 4 - Permitted users consume dashboards safely (Priority: P4)

**Goal**: Viewers and explicitly granted external clients consume dashboards without edit/clone rights; responses omit SQL and connection metadata; table widgets paginate client-side; permitted users export table widgets as CSV with current filter state.

**Independent Test**: Viewer opens granted dashboard, uses filters, cannot edit; external client with `asset_grants` sees only granted dashboard without `sql_text`; table widget pages client-side; CSV export returns ≤10,000 rows with headers.

### Tests for User Story 4

- [ ] T059 [P] [US4] Add integration tests for permission-filtered dashboard lists across `admin`, `analyst`, `viewer`, and `external_client` in `apps/api/tests/integration/test_dashboards_visibility.py`
- [ ] T060 [P] [US4] Add integration tests in `apps/api/tests/integration/test_dashboards_external_client.py` verifying external clients never receive `sql_text`, connection fields, or unrelated dashboards
- [ ] T061 [P] [US4] Add contract tests for `GET .../widgets/{widget_id}/export.csv` in `apps/api/tests/contract/test_dashboard_widget_export_contract.py`
- [ ] T062 [P] [US4] Add unit tests for table widget CSV renderer in `apps/api/tests/unit/test_dashboard_csv_export.py` covering headers, zero rows, escaping, and 10,000-row cap (reuse patterns from `apps/api/tests/unit/test_saved_question_csv_export.py`)
- [ ] T063 [P] [US4] Add integration tests in `apps/api/tests/integration/test_dashboard_widget_export.py` for internal export permission, external `can_export` true/false, and refusal for non-table widget types

### Implementation for User Story 4

Implementation notes for US4:

- Viewers may execute widgets and use filters but `can_edit=false` on detail.
- External clients require `asset_grants(asset_type='dashboard')`; ignore collection inheritance.
- `get_dashboard` returns consumer-safe shape for viewers/external clients (no SQL, no connection metadata).
- Table widget UI paginates **client-side only** over rows already returned by execute — no extra execute calls on page change.
- CSV export allowed only for `widget_type='table'`; KPI/bar/line must return `unsupported_widget_type` or hide export affordance.
- Export reuses merged filter state and Feature 4 widget execution path before CSV rendering.

- [ ] T064 [US4] Wire `get_dashboard`, `list_dashboards`, `execute_widget`, and `export_widget_csv` in `apps/api/app/dashboards/service.py` to helpers from T014 in `apps/api/app/dashboards/authz.py` so viewers cannot patch/delete/clone, external clients cannot list ungranted dashboards, and export follows Feature 5 internal/external rules
- [ ] T065 [US4] Ensure permission-filtered queries in `apps/api/app/dashboards/repository.py` and consumer-safe DTO mapping in `get_dashboard`/`list_dashboards` strip authoring-only fields for non-editors
- [ ] T066 [US4] Implement CSV renderer in `apps/api/app/dashboards/csv_export.py` mirroring `apps/api/app/questions/csv_export.py` (headers, escaping, 10,000-row cap)
- [ ] T067 [US4] Implement `export_widget_csv` service method in `apps/api/app/dashboards/service.py` that re-checks export permission, refuses non-table widgets, merges filters from `filter_state` query input, executes via widget path, and returns CSV or normalized JSON error
- [ ] T068 [US4] Implement export route in `apps/api/app/routes/dashboards.py` for `GET /workspaces/{workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/export.csv` with `filter_state` and `bypass_cache` query params; document `filter_state` as URL-encoded JSON `{ "global_filter_values": {...} }` in `apps/web/app/lib/dashboards-api.ts`
- [ ] T069 [US4] Implement `exportDashboardWidgetCsv` in `apps/web/app/lib/dashboards-api.ts` and add export button to `apps/web/app/dashboards/[dashboardId]/widgets/table-widget.tsx` only, with loading/error states and hidden for users without export permission
- [ ] T070 [US4] Update `apps/web/app/dashboards/[dashboardId]/widgets/table-widget.tsx` to paginate rows client-side with page size control and **no** additional API calls when changing pages
- [ ] T071 [US4] Update `apps/web/app/dashboards/[dashboardId]/edit/page.tsx` to hide builder controls when `can_edit=false` and redirect viewers to viewer route `apps/web/app/dashboards/[dashboardId]/page.tsx`
- [ ] T072 [US4] Run US4 tests with `cd apps/api && uv run pytest tests/integration/test_dashboards_visibility.py tests/integration/test_dashboards_external_client.py tests/contract/test_dashboard_widget_export_contract.py tests/unit/test_dashboard_csv_export.py tests/integration/test_dashboard_widget_export.py`

**Checkpoint**: US4 delivers safe multi-role consumption and table CSV export.

---

## Phase 7: User Story 5 - Analyst clones a dashboard into a target collection (Priority: P5)

**Goal**: Analyst clones a readable dashboard into a permitted target collection; clone has new id/owner; source unchanged; permissions follow target collection; source `dashboard_grants` not copied.

**Independent Test**: Clone dashboard into another collection; verify new id, cloner ownership, copied widgets/filters, source unchanged, no copied dashboard grants.

### Tests for User Story 5

- [ ] T073 [P] [US5] Add contract tests for `POST .../dashboards/{dashboard_id}/clone` in `apps/api/tests/contract/test_dashboard_clone_contract.py`
- [ ] T074 [P] [US5] Add integration tests in `apps/api/tests/integration/test_dashboard_clone.py` covering new owner, copied layout/filters/widgets, unchanged source, target collection permissions, no copied `dashboard_grants`, and viewer/external_client clone attempts returning 403

### Implementation for User Story 5

Implementation notes for US5:

- Clone creates new `dashboards.id` and new widget rows with new ids.
- Clone sets `created_by_membership_id` to cloner.
- Clone copies `title` (with optional suffix), `definition`, widget configs/layouts/bindings/overrides.
- After resolving the final clone title (explicit `title` or copied title + suffix), validate uniqueness in the target collection; append an incrementing counter until unique or return `duplicate_dashboard_title` (409) if no safe title can be assigned.
- Clone must not copy `dashboard_grants` from source.
- Viewers/external clients attempting clone receive 403.

- [ ] T075 [US5] Implement clone helper in `apps/api/app/dashboards/clone.py` and repository insert methods that duplicate dashboard + widgets into target collection
- [ ] T076 [US5] Implement `clone_dashboard` service method in `apps/api/app/dashboards/service.py` re-checking source view permission and target collection edit permission
- [ ] T077 [US5] Implement clone route in `apps/api/app/routes/dashboards.py` for `POST /workspaces/{workspace_id}/dashboards/{dashboard_id}/clone` returning 201 `DashboardDetail`
- [ ] T078 [US5] Implement `cloneDashboard` client method in `apps/web/app/lib/dashboards-api.ts` and add clone action to `apps/web/app/dashboards/[dashboardId]/page.tsx` or edit page with target collection selector (visible only when `can_edit` and role is `admin`/`analyst`)
- [ ] T079 [US5] Run US5 tests with `cd apps/api && uv run pytest tests/contract/test_dashboard_clone_contract.py tests/integration/test_dashboard_clone.py`

**Checkpoint**: US5 completes clone workflow without permission leakage.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Types sync, loading states, collection-delete guard, Playwright smoke, quickstart validation, and full regression.

- [ ] T080 [P] Final types sync: verify `packages/types/src/dashboards.ts` and `packages/types/src/index.ts` exactly match `specs/006-dashboard-builder/contracts/dashboards.openapi.yaml`, then run `cd packages/types && pnpm build`
- [ ] T081 [P] Implement loading skeleton in `apps/web/app/dashboards/loading.tsx` for dashboard list and detail loading states
- [ ] T082 [P] Update collection delete path in `apps/api/app/questions/service.py` to call `count_active_dashboards_by_collection` from T011 and return `collection_not_empty` when active dashboards remain
- [ ] T083 [P] Add Playwright smoke test `apps/web/tests/dashboards.spec.ts` covering create dashboard, add widget, change global filter auto-refresh, override indicator visibility, viewer read-only mode, and soft timing assertion that dashboard shell is interactive within 5s with mocked fast execute responses (SC-007) using mocked API on port 4010 per `apps/web/playwright.config.ts`
- [ ] T084 [P] Add Vitest unit tests in `apps/web/tests/dashboard-filter-state.test.ts` for client-side filter-binding helpers (which widgets should execute when a global filter changes)
- [ ] T085 Add Feature 6 quickstart validation notes to `specs/006-dashboard-builder/quickstart.md` if implementation discovers required fixtures or env vars not already documented
- [ ] T086 Run full dashboard API regression with `cd apps/api && uv run pytest tests/unit/test_dashboard_filters.py tests/unit/test_dashboard_csv_export.py tests/contract/test_dashboards_crud_contract.py tests/contract/test_dashboard_widget_execute_contract.py tests/contract/test_dashboard_widget_export_contract.py tests/contract/test_dashboard_clone_contract.py tests/integration/test_dashboards_authoring.py tests/integration/test_dashboards_title_uniqueness.py tests/integration/test_dashboards_stale_update.py tests/integration/test_dashboard_filter_refresh.py tests/integration/test_dashboard_filter_overrides.py tests/integration/test_dashboards_visibility.py tests/integration/test_dashboards_external_client.py tests/integration/test_dashboard_widget_export.py tests/integration/test_dashboard_clone.py tests/integration/test_dashboard_widget_audit.py`
- [ ] T087 Run web validation with `cd apps/web && pnpm lint && pnpm test`
- [ ] T088 Verify external-client responses omit `sql_text` and connection metadata by reviewing `apps/api/app/dashboards/schemas.py`, `apps/api/app/dashboards/service.py`, and `apps/api/tests/integration/test_dashboards_external_client.py`
- [ ] T089 Verify scope boundaries: no widget-local-only filters, no unsupported chart types, no async export — grep `apps/api/app/dashboards/` and `apps/web/app/dashboards/` for forbidden scope keywords listed in guardrails

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**.
- **US1 (Phase 3)**: Depends on Foundational — **MVP scope**.
- **US2 (Phase 4)**: Depends on Foundational + US1 execute/detail paths.
- **US3 (Phase 5)**: Depends on US2 filter merge and builder UI.
- **US4 (Phase 6)**: Depends on US1 execute + US2 filters (export uses merged filter state).
- **US5 (Phase 7)**: Depends on US1 dashboard CRUD/repository.
- **Polish (Phase 8)**: Depends on all targeted user stories.

### User Story Dependencies

| Story | Depends on | Independently testable with |
|-------|------------|----------------------------|
| US1 P1 | Foundational | API integration tests + builder UI |
| US2 P2 | US1 execute/detail | Filter unit/integration tests |
| US3 P3 | US2 global filters | Override integration tests |
| US4 P4 | US1 execute, US2 filters | Role/export integration tests |
| US5 P5 | US1 CRUD | Clone integration tests with seeded dashboards |

### Within Each User Story

1. Write tests for the story (they should fail).
2. Implement service/repository changes.
3. Implement routes.
4. Implement web API client + UI.
5. Run the story's pytest command before moving on.

---

## Parallel Opportunities

- **Phase 1**: T005 and T006 parallel after T001–T004 started.
- **Phase 2**: T010, T011, T013, T014, T018–T021, T022 parallel after T007–T009 agree on DTO names.
- **US1**: T023–T027 tests parallel; T033–T036 UI parallel after T032 client exists.
- **US2**: T040–T042 parallel before implementation.
- **US4**: T059–T063 parallel before implementation.
- **Polish**: T080–T083 parallel after stories complete.

### Parallel Example: User Story 1

```bash
# Write tests in parallel
pytest tests/contract/test_dashboards_crud_contract.py
pytest tests/integration/test_dashboards_authoring.py
pytest tests/integration/test_dashboards_title_uniqueness.py
pytest tests/integration/test_dashboards_stale_update.py

# Build UI in parallel after API client exists
apps/web/app/dashboards/page.tsx
apps/web/app/dashboards/[dashboardId]/edit/page.tsx
apps/web/app/dashboards/[dashboardId]/dashboard-grid.tsx
apps/web/app/dashboards/[dashboardId]/widgets/kpi-widget.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001–T006).
2. Complete Phase 2 (T007–T022).
3. Complete US1 (T023–T039).
4. **STOP and validate**: analyst creates dashboard, adds widget, executes, views results.
5. Demo before filters, overrides, export, or clone.

### Incremental Delivery

1. US1 → dashboard builder MVP  
2. US2 → global filters + auto-refresh  
3. US3 → visible overrides  
4. US4 → safe consumption + table CSV  
5. US5 → clone  
6. Polish → full regression  

### Task Count Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| Setup | T001–T006 (6) | — |
| Foundational | T007–T022 (16) | — |
| US1 MVP | T023–T039 (17) | P1 |
| US2 Filters | T040–T051 (12) | P2 |
| US3 Overrides | T052–T058 (7) | P3 |
| US4 Consumption | T059–T072 (14) | P4 |
| US5 Clone | T073–T079 (7) | P5 |
| Polish | T080–T089 (10) | — |
| **Total** | **89 tasks** | |

### Suggested MVP Scope

**Stop after T039 (User Story 1)** for first demo: dashboard list, builder, widgets, basic execute, viewer mode.

### Notes for Lower-Cost Implementers

- If stuck on a task, read the matching section in `specs/006-dashboard-builder/data-model.md` and the OpenAPI schema for that endpoint.
- Copy patterns from Feature 5 files explicitly named in tasks (`questions/service.py`, `questions/csv_export.py`, `questions/authz.py`) — adapt names to `dashboards/` but keep the same layering.
- Do not implement `POST /dashboards/{id}/execute` batch endpoint unless a task explicitly asks for it; per-widget execute is the MVP contract.
- `filter_state` for CSV export is a URL-encoded JSON string of `FilterStateExport` (`global_filter_values` required, max 2048 characters per contract); server merges the widget's stored `filter_overrides` during export — see `contracts/dashboards.openapi.yaml` and implement in T068.
- Recharts is already a dependency; do not add Chart.js or D3.
- Widget auto-refresh means: when `globalFilterValues` changes, each widget component checks its `filter_bindings` and calls execute only if the changed key is bound.
