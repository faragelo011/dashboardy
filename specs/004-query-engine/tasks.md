
---
description: "Task list for Feature 004 — Query engine implementation"
---

# Tasks: Query Engine (004-query-engine)

**Input**: `/specs/004-query-engine/` (`plan.md`, `spec.md`, `data-model.md`, `research.md`, `contracts/query-execute.openapi.yaml`, `quickstart.md`)

**Prerequisites**: Feature 2 tenancy + JWT context; Feature 3 `data_connections`, Vault + Snowflake test path (`app.connections.*`).

**Locked numbers** (cite these verbatim in code comments or constants — do **not** invent new defaults):

| Constant | Value | Source |
|----------|-------|--------|
| Snowflake statement timeout | 30 seconds | constitution §7.4 / §8.1 |
| Default max rows returned (interactive) | 5_000 | constitution §7.4 |
| Hard max rows | 10_000 | constitution §7.4 |
| Concurrent Snowflake executions per API process | 10 | constitution §8.2 + research |
| Waiting requests buffer (FIFO depth) | 50 | docs/implementation-plan.md Feature 4 |
| Max wait to acquire execution slot | 25 seconds | docs/implementation-plan.md Feature 4 |
| Cache TTL KPI / scalar (`kpi`) | 600 s (10 min) | constitution §3.3 |
| Cache TTL charts (`chart`) | 300 s (5 min) | constitution §3.3 |
| Cache TTL tables (`table`) | 120 s (2 min) | constitution §3.3 |
| Global cache TTL ceiling | 900 s (15 min) | constitution §3.3 |
| Audit retention | ≥ 90 days | constitution §7.6 / spec FR-008 |

**Who may call execute**: workspace members with role `admin`, `analyst`, or `viewer` only. **`external_client` → HTTP 403** with `authz_denied` before parser or Snowflake (spec clarification).

## Format checklist

`- [ ] Tnnn [P] [USn] Verb-first description naming full path`

Use `[P]` only when task touches **different files** than incomplete upstream tasks **and** does not need their unfinished code.

---

## Phase 1: Setup

**Purpose**: Dependencies and empty package scaffold so Phase 2 can land code in stable paths (`plan.md`).

- [X] T001 Add `sqlglot` dependency with a sane lower bound (e.g. `sqlglot>=24`) to `apps/api/pyproject.toml` under `[project.dependencies]`, run `uv lock`/`uv sync` from `apps/api` as documented in repo norms.
- [X] T002 Create package marker `apps/api/app/query_engine/__init__.py` exporting nothing yet (docstring referencing `specs/004-query-engine/plan.md`).
- [X] T003 [P] Add optional configuration entries to `apps/api/app/config.py` for defaults above (timeouts, limits, concurrency, queue sizes) wired from env vars with **numeric defaults matching the locked table**, so tuning does not require code edits.

---

## Phase 2: Foundational (blocks all user stories)

**⚠️** No `[USn]` tasks start until migrations + parser skeleton + audit writer + tenancy gate exist.

### Database & ORM

- [X] T004 Add Alembic revision `apps/api/app/db/migrations/versions/` (next sequential id — inspect existing files) creating **`query_audit_logs`** and **`cache_entries`** columns, enums or `VARCHAR`+`CHECK` for `status` and `presentation_class`, indexes **`(tenant_id, created_at DESC)`**, **`UNIQUE (tenant_id, cache_key)`**, **`(expires_at)`**, FKs per `specs/004-query-engine/data-model.md` (defer FK on `saved_question_id`/`dashboard_id` until tables exist—nullable UUID columns **without FK** per data-model notes).
- [X] T005 Implement SQLAlchemy models in `apps/api/app/models/query_engine.py` matching the migration (`QueryAuditLog`, `CacheEntry`); composite tenant FK patterns **must mirror** existing style in `apps/api/app/models/data_connections.py`).
- [X] T006 Export new models from `apps/api/app/models/__init__.py` (follow existing exports pattern).

### Enums & hashing

- [X] T007 Add `apps/api/app/query_engine/enums.py` with `StrEnum` values aligning to `specs/004-query-engine/contracts/query-execute.openapi.yaml`: `ExecutionStatus`, `QueryMode`, `PresentationClass` (canonical string values: `adhoc`, `saved_question`, `widget`, statuses including `warehouse_busy`, `authz_denied`).
- [X] T008 Implement `apps/api/app/query_engine/hashing.py`: `canonical_sql_sha256(canonical_sql: str) -> str` (64-char hex); `bound_parameters_projection_hash(bindings: dict[str, Any]) -> str` using **sorted keys**, **type-tagged stable serialization** (no raw PII persisted in audit beyond this hash—see spec FR-007).

### Parser (sqlglot)

- [X] T009 Implement `apps/api/app/query_engine/parser.py`: `parse_and_validate(sql: str) -> CanonicalSql` raising a **single** domain exception type (e.g. `QueryParserError`) carrying `error_code="rejected_by_parser"`; enforce **single statement**; allow only SELECT / WITH…SELECT AST roots; deny `INSERT`, `UPDATE`, `DELETE`, `MERGE`, DDL, `CALL`, transactions, **`USE ROLE`/`USE DATABASE`/`USE SCHEMA`/`USE WAREHOUSE`/`SET`/session mutation** matching constitution §7.5; expose `canonicalize_for_hash(sqlglot_tree) -> str` for stable `sql_hash` (spec FR-005).
- [X] T010 Add golden fixture directory `apps/api/tests/fixtures/query_sql/` with subfolders **`allowed/`** and **`denied/`** (each file one SQL string); document in `apps/api/tests/fixtures/query_sql/README.md` how add cases for SC‑001 coverage.

### Concurrency gate

- [X] T011 Implement `apps/api/app/query_engine/queue.py`: module-level **`asyncio.Semaphore(10)`** for active executions; **`asyncio.Queue(maxsize=50)`** for waiters; async context manager `acquire_execution_slot()` that either acquires semaphore within **25s** or raises `QueueFullError` / `QueueTimeoutError` mapped later to HTTP **429** `warehouse_busy` (constitution §8.2). Must be safe under concurrent `asyncio` tasks (document that effective capacity scales per process instance).

### Tenancy authorization hook

- [X] T012 Add `apps/api/app/tenancy/permissions.py` helper e.g. `can_execute_workspace_query(actor_role: MembershipRole) -> PermissionDecision` returning **deny** for `MembershipRole.external_client`, **allow** for `admin`/`analyst`/`viewer`.
- [X] T013 Add `apps/api/app/query_engine/authz_modalities.py`: async function `(session, ResolvedTenancy, request_body) -> PermissionDecision` implementing Feature 4 baseline: **`external_client` already blocked** upstream; for internal roles accept a **placeholder** rule: allow `adhoc` + `saved_question` + `widget` when membership is active and workspace matches path—**document** that saved-question / widget asset checks move to Features 5–6 (`spec.md` assumptions). Returning denied must emit audit with `authz_denied`.

### Persistence helpers

- [X] T014 Implement `apps/api/app/query_engine/audit_repo.py`: async `insert_audit_log(session, dto)` writing **one row** atomically before returning HTTP response (spec FR‑020 edge: process crash may omit—document only).
- [X] T015 Implement `apps/api/app/query_engine/cache_repo.py`: async CRUD **`get_by_tenant_cache_key`**, **`upsert_entry`**, **`delete_expired`** (TTL sweeper), **`delete_by_identity_prefix`** optional stub for future invalidation APIs.

**Checkpoint**: DB migrates cleanly; models import; parser module importable; queue acquire compiles; permission helper returns expected booleans by role.

---

## Phase 3: User Story 1 — Ad hoc read-only execution (P1) 🎯 MVP

**Goal**: Internal user runs **parameterized** ad hoc SQL; parser blocks bad SQL; Snowflake runs with timeout + row cap; **every** attempt writes `query_audit_logs`; **no cache** for ad hoc (spec FR‑013).

**Independent test**: `POST /workspaces/{workspace_id}/query/execute` with `mode=adhoc` returns `200` + rows for benign `SELECT 1`; `422` for denied golden SQL **without** calling Snowflake; audit row exists with matching `sql_hash` / zeros for `duration_ms` pre-warehouse rejections appropriately; `external_client` JWT yields **403** before Snowflake.

### Implementation

- [x] T016 [US1] Implement Pydantic request/response schemas in `apps/api/app/query_engine/schemas.py` mirroring **`specs/004-query-engine/contracts/query-execute.openapi.yaml`** (`QueryExecuteRequest` discriminated union, `QueryExecuteSuccessResponse`, `ColumnDescriptor`, `QueryExecuteMeta`).
- [x] T017 [US1] Implement Snowflake runner `apps/api/app/query_engine/snowflake_run.py`: given resolved `DataConnection` + Vault-retrieved credential (reuse **`app.connections.resolver`/Vault patterns** — do **not** duplicate Vault HTTP), establish connection with **≤30s** network/query timeout knob, **`parameter bindings only`** executed via Snowflake connector param style compatible with sanitized SQL placeholders; enforce **fetch capped at configured max rows**, set `truncated` flag vs `row_limit_exceeded` per product rules; optionally read `QUERY_ID`/`bytes scanned` telemetry when available (`bytes_scanned` nullable columns).
- [x] T018 [US1] Implement parameter coercion module `apps/api/app/query_engine/parameter_binding.py`: for `adhoc`, ensure every **`%(name)s`** (or chosen convention—**pick one documented style**) in canonical SQL maps to supplied `parameters` dict keys; mismatches/`extra keys` **`422`** before warehouse; hashing uses T008 helpers.
- [x] T019 [US1] Implement orchestration **`execute_query`** in `apps/api/app/query_engine/pipeline.py` ordered steps mirroring **`specs/004-query-engine/research.md`** & `docs/implementation-plan.md`: resolve membership → **`external_client` short-circuit 403 + audit `authz_denied`** → modality auth stub (T013) → load **`data_connections`** requiring **`active`** operational state (reuse Feature 3 repository/service semantics—if no usable connection respond **404** per OpenAPI README with clear `error_code` e.g. `connection_not_ready`) → `parse_and_validate` → bind params → **`acquire_execution_slot`** (T011); on success run Snowflake; **always append audit row** with `cache_hit=false` for adhoc; normalize JSON envelope.
- [x] T020 [US1] Add FastAPI router `apps/api/app/routes/query.py` with `router = APIRouter(tags=["query"])` and **`POST "/workspaces/{workspace_id}/query/execute"`** matching contract path; reuse **`get_verified_supabase_user`**, **`get_db`**, **`resolve_membership_for_workspace`** patterns from `apps/api/app/routes/connections.py`; map domain errors to **`HTTPException`** detail dicts **`error_code` + `message`** consistent with **`apps/api/app/main.py`** normalization handler.
- [x] T021 [US1] Register router in `apps/api/app/main.py` (`include_router`) and export in `apps/api/app/routes/__init__.py` if that module aggregates routers.
- [x] T022 [P] [US1] Add unit tests `apps/api/tests/unit/test_query_parser.py` iterating **`allowed/` + `denied/`** fixtures; assert **Snowflake connector is not imported/called** in parser tests (monkeypatch if needed).

**Checkpoint MVP**: Authenticated analyst can run `SELECT 1`; denied SQL yields `422`; audit populated; Snowflake touched only after parser passes.

---

## Phase 4: User Story 2 — Concurrency & `warehouse_busy` (P2)

**Goal**: Under synthetic overload, callers receive deterministic **`warehouse_busy`** (**HTTP 429** per OpenAPI contract) not silent **`500`**; unrelated tenants unaffected (spec isolation).

**Independent test**: Integration test spawning >10 concurrent slow mocked executions → ≥1 **`429`** with `error_code=warehouse_busy` when queue saturation triggers; orderly completion without deadlocks.

- [X] T023 [US2] Extend `apps/api/app/query_engine/pipeline.py` (or router) so `QueueFullError` / wait timeout raises translate to **`HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail={"error_code":"warehouse_busy",...})`** and audit row **`status=warehouse_busy`** when appropriate (per spec: still **one** audit row per attempt).
- [X] T024 [P] [US2] Add `apps/api/tests/integration/test_query_execute_concurrency.py` using `pytest-asyncio` + `httpx.AsyncClient` **or** direct pipeline calls with dependency-injected fake slow runner; include marker/skip if Snowflake env absent but keep queue logic testable with stubbed runner.

**Checkpoint**: Load story demonstrably stable at contract boundary.

---

## Phase 5: User Story 3 — Result cache (P3)

**Goal**: `saved_question` + `widget` modes may read/write `cache_entries` when eligible; **permission re-check** before returning cached payload; **`bypass_cache`** forces miss; ad hoc **never** writes cache; TTL classes per presentation_class; sweeper removes expired rows (constitution §3.3).

**Independent test**: Two identical `saved_question` requests (mocked Snowflake) within TTL: first `cache_hit=false`, second `cache_hit=true`; after permission flip, cached payload **must not** be returned; `bypass_cache=true` yields miss.

### Implementation

- [X] T025 [US3] Implement deterministic cache identity builder `apps/api/app/query_engine/cache_identity.py`: inputs minimally `tenant_id`, `connection_id`, `secret_version` from connection row at write time, `sql_hash`, `bound_parameters_hash`, `mode`, optional IDs (`saved_question_id`, `dashboard_id`, `widget_id`), optional `filter_state_hash`; compute **deterministic SHA-256 → hex** truncated **if needed** to fit `cache_key VARCHAR(128)` (document truncation strategy safely—prefer hex of hash fits 64 chars).

- [X] T026 [US3] Implement TTL resolver `presentation_class_ttl_seconds(PresentationClass) -> int` in `apps/api/app/query_engine/cache_ttl.py` using locked table rows; clamp user-supplied TTL lowering only (Feature 6 field stub optional—omit until dashboard JSON arrives, but reserve TODO constant hook).

- [X] T027 [US3] Extend `pipeline.py` branching: modes **`saved_question`** and **`widget`** attempt cache **read after** modality auth re-check succeeds; write cache after successful Snowflake **`200` path** (`ok`) with expiry = `now + ttl`; on read hit: run **fresh** modality authorization + membership role checks before returning serialized JSON payload; refusal → behave as cache miss (**no stale rows**).

- [X] T028 [US3] Add background sweeper wired in FastAPI **`lifespan`** (`apps/api/app/main.py`): `asyncio.create_task` periodic `DELETE FROM cache_entries WHERE expires_at < now()` sleeping e.g. 60s—document shutdown cancellation; alternative acceptable if cron-based **document explicitly** + add manual admin endpoint (`NO` unless spec grows—prefer internal task per quickstart simplicity).

### Tests (supports SC‑003 explicitly)

- [X] T029 [P] [US3] Add `apps/api/tests/integration/test_query_cache_behavior.py` with faked warehouse + seeded cache rows verifying hit/miss, `bypass_cache`, and **`adhoc` never persists** cache rows.

**Checkpoint**: Cache correctness & auth re-check observable in tests without manual Snowflake reliance.

---

## Phase 6: Polish & internal Run UI + docs

**Purpose**: FR‑017 minimal surface & operator ergonomics (`spec.md` FR‑017).

- [X] T030 Implement protected page `apps/web/app/query-run/page.tsx` (+ small client component file colocated if preferred) issuing `POST /workspaces/{workspace_id}/query/execute` with JSON body **`mode:"adhoc"`** using existing web API base URL + session fetch helpers (mirror `apps/web/app/connections/*` token/header pattern); show raw JSON outcome + **`meta.status` / `truncated` / duration** visibly.
- [X] T031 Add navigation affordance guarded to internal testers only (minimal link/button from existing protected shell — e.g. `apps/web/app/layout.tsx` or existing nav component referencing user role from `/me` payload — **avoid** exposing to unsigned users).
- [X] T032 [P] Add hand-written TS types Optional `packages/types/src/query-execute.ts` matching OpenAPI (or codegen note README only—pick one minimal approach documenting chosen path).
- [X] T033 [P] Update `specs/004-query-engine/quickstart.md` if endpoints/dev ports diverge during integration; verify checklist section matches actual URLs.
- [ ] T034 Run through manual checklist in `specs/004-query-engine/quickstart.md` after implementation (record gaps as GitHub issue—no scope expansion here).

---

## Dependencies & Execution Order

### Phase graph

```
Phase 1 (T001–T003)
       ↓
Phase 2 Foundational (T004–T015)  ← blocks everything
       ↓
Phase 3 US1 (T016–T022)  ← MVP STOP line
       ↓
Phase 4 US2 (T023–T024)  ← can begin after Phase 3 queue wired (T019+T023 touch same files sequentially)
       ↓
Phase 5 US3 (T025–T029)
       ↓
Phase 6 Polish (T030–T034)
```

### User story parallelism (after foundational)

| Story | Starts after | Depends on earlier story files? |
|-------|---------------|---------------------------------|
| US1 | Phase 2 | No |
| US2 | Pipeline + router exist (≥ T019–T020) | Yes — extends same pipeline |
| US3 | US1 executes writes audit + Snowflake abstraction stable | Yes — layering on pipeline |

Implement **US2** after **baseline execute path** merges to reduce merge conflicts in `pipeline.py`.

### Parallel opportunities

After **T019** completes, **T022** parser unit tests maintenance can parallelize doc-only **`T033`** chores by different contributors.

Golden fixtures (**T010**) can accumulate in parallel once **`parser.py`** public API stabilizes (**after T009**).

---

## Parallel Example: Parser hardening sprint

```bash
# Contributor A expands coverage:
Task T010 fixture files apps/api/tests/fixtures/query_sql/denied/*.sql

# Contributor B aligns docs:
Task T033 quickstart tweaks specs/004-query-engine/quickstart.md

# Contributor C strengthens unit tests once T009 merged:
Task T022 apps/api/tests/unit/test_query_parser.py
```

---

## Implementation Strategy

### MVP freeze (recommended)

1. Finish **Phase 1 + Phase 2** completely.
2. Finish **Phase 3 (US1)** through **T022**.
3. **STOP**: demo MVP (`spec SC‑001`/`SC‑006` materially satisfied for ad hoc lane).
4. Only then tackle **Phase 4** then **Phase 5** sequentially because both mutate `pipeline.py`.

### Ordering tips forjunior/smaller LLMs

- Never edit **`pipeline.py`** without running **`ruff`** + **`pytest`** subset touched.
- Prefer **thin** `routes/query.py`; push logic into `query_engine/` modules (+ helps tests).
- When Snowflake unavailable locally, **`pytest.importorskip`** or env flag to skip integration files—parser & queue tests remain mandatory CI signal.

---

## Notes

- **Do not log** Vault secrets / raw JWT / raw parameter payloads in structlog contexts.
- **`saved_question_id` correctness**: until Feature 5 tables exist you may stub DB lookup with **temporary in-memory UUID placeholder** guarded by pytest only—**shipping** behavior should **404/not_found** for unknown IDs **or** treat as parameterized **adhoc-SQL-not-yet-supported** documented error; clarify product choice minimal: **recommended** ⇒ `422` **`saved_question_not_implemented`** for unknown IDs to avoid phantom execution.
- **Widget mode** optional stub: may return **`422` feature_not_available** until Feature 6 if product owner agrees—**default** per spec is implement request schema + cache key fields now, execute path may short-circuit with explicit error until dashboard service exists; if short-circuiting, still **write audit** row with `rejected_by_parser` OR custom `error_code` consistent with HTTP **422** (choose one—document in `pipeline.py` docstring when landing stub).

---

## Extension Hooks

**Optional Pre-Hook** (`.specify/extensions.yml` → `hooks.before_tasks`):  
`speckit.git.commit` — commit before task generation? To run: `/speckit.git.commit`

**Optional Post-Hook** (`hooks.after_tasks`):  
`speckit.git.commit` — commit after task generation? To run: `/speckit.git.commit`

---

## Summary counts

| Phase | Task IDs | Count |
|-------|----------|-------|
| Setup | T001–T003 | 3 |
| Foundational | T004–T015 | 12 |
| US1 | T016–T022 | 7 |
| US2 | T023–T024 | 2 |
| US3 | T025–T029 | 5 |
| Polish | T030–T034 | 5 |
| **Total** | **T001–T034** | **34** |

Every task line includes at least one concrete repo path or explicit fixture location.
