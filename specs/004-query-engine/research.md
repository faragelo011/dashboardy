# Phase 0 Research: Query Engine

**Feature**: `004-query-engine`  
**Spec**: [spec.md](./spec.md) | **Constitution**: v1.2.0  

All technical-context items are resolved from the feature spec, constitution §7–§8, and [docs/implementation-plan.md](../../docs/implementation-plan.md) Feature 4. No blocking unknowns remain.

## 1. SQL structural validation and hashing

**Decision**: Use **sqlglot** with **`dialect="snowflake"`** — `parse_one` for accept/reject, AST policy checks for MVP deny patterns, and sqlglot-driven **canonicalization** to produce a stable string for `sql_hash`.

**Rationale**: Constitution §7.5 requires a real parser on the backend; the monorepo stack already lists sqlglot; canonical hashing supports audit and cache keys without storing raw SQL.

**Alternatives considered**:

- Regex-only validation — rejected (brittle, violates constitution spirit).
- Delegating validation only to Snowflake — rejected (secondary app-layer defense remains mandatory per §7.5).

## 2. Warehouse execution and binding

**Decision**: Execute through **`snowflake-connector-python`** using **server-side parameter binding** (`pyformat` / bound parameters) so user filter values never enter string interpolation in application code.

**Rationale**: Matches §7.5 parameter rules and existing Feature 3 connectivity patterns; connector is already a declared dependency.

**Alternatives considered**:

- ODBC / HTTP driver — deferred; unnecessary divergence for MVP.

## 3. Limits, timeouts, backpressure

**Decision**:

- Statement **timeout**: **30s** (constitution §7.4 / §8.1).
- **Default row cap** for interactive execution: **5,000** rows; **hard ceiling** **10,000** rows (constitution §7.4). Enforce `ROW LIMITED` or driver `limit` / fetch cap so overflow maps to `row_limit_exceeded` with truncation metadata.
- **Per-instance** concurrency: **`asyncio.Semaphore(10)`** active Snowflake executions (aligns with constitution §8.2 “10 concurrent query executions”).
- **Wait queue**: bounded queue depth **50**; maximum **wall-clock wait to acquire a slot** **25s** (implementation plan Feature 4). If the queue is full or wait expires → respond with typed **`warehouse_busy`** (not generic 5xx).

**Rationale**: Locks numeric SLOs from normative docs; gives implementable queue semantics and deterministic client UX per §8.2.

**Alternatives considered**:

- Redis-backed global queue — explicitly post-MVP per implementation plan; instance-local queue documented as “10 × replicas” effective capacity.

## 4. Audit record shape and retention

**Decision**: Persist **`query_audit_logs`** matching constitution §7.6 field set. Extend allowed **`status`** values on the wire and in storage to include **`authz_denied`** and **`warehouse_busy`** (feature spec + §8.2) in addition to §7.6 core set.

**Rationale**: Clarified product vocabulary must not contradict observability; statuses are categorical, not stack-specific.

**Alternatives considered**:

- Mapping `warehouse_busy` to HTTP 503 only without audit status — rejected (spec FR-020 requires one audit row per terminal attempt).

## 5. Result cache

**Decision**: **`cache_entries`** in **Supabase Postgres** (jsonb payload + `expires_at`), tenant-scoped lookup by deterministic **`cache_key`**, TTL rules per constitution §3.3:

| Presentation / modality | TTL ceiling |
|-------------------------|------------|
| Scalar / KPI class      | 10 minutes |
| Chart class (bar/line)  | 5 minutes  |
| Table class             | 2 minutes  |
| Ad hoc                  | no cache   |

Workspace-level TTL **lowering** only (never above class default, never above **15 minutes** global ceiling). On cache read, **re-run authorization precondition** before returning payload; on failure treat as miss and do not return stale rows.

**Rationale**: Matches constitution and spec FR-009–FR-013; Postgres cache table is already the project pattern.

**Alternatives considered**:

- In-memory only — rejected (no cross-replica reuse; poor fit for “10 × instances” scaling story).

## 6. Cache identity and invalidation

**Decision**: `cache_key` / identity inputs include at minimum: **`tenant_id`**, **connection id** + **secret version / rotation marker** (reuse Feature 3 `secret_version` or equivalent bump on rotation), **`sql_hash`**, **`bound_parameters_hash`**, modality marker, **`saved_question_id`** when present, **`dashboard_id` + `widget_id`** when widget modality, and **caller-supplied `filter_state_hash`** until Feature 6 formalizes filter binding. Invalidate on SQL/parameter-definition change, credential rotation, substantive filter mapping change (when those assets exist), TTL expiry, **`bypass_cache`**, and janitorial delete of expired rows.

**Rationale**: Mirrors implementation plan Feature 4 cache key composition; avoids cross-tenant bleed and stale permission surfaces.

## 7. Caller roles (clarified)

**Decision**: Only internal membership roles **`admin`**, **`analyst`**, and **`viewer`** may invoke execution in this milestone; **`external_client`** receives **`authz_denied`** before validation (see spec clarifications).

**Rationale**: Locked in spec clarification session 2026-05-08.

## 8. Optional debug SQL storage

**Decision**: **Defer** separate `query_debug_sql` admin-only table unless operational need arises; do not place raw SQL in `query_audit_logs`.

**Rationale**: Spec edge case allows omission when general audit omits raw text; reduces PII/sensitive leakage surface.

## 9. Minimal web surface (FR-017)

**Decision**: Add a **minimal protected “Run query” page** under the web app calling `POST …/query/execute` for **internal** roles only, or an equivalent dev-only route behind the same auth — sufficient for SC-006 style dry runs without building Feature 5 UX.

**Rationale**: Satisfies explicit spec deliverable without scope creep into saved-question management.
