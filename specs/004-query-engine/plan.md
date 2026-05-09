# Implementation Plan: Query Engine

**Branch**: `004-query-engine` | **Date**: 2026-05-08 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/004-query-engine/spec.md`

## Summary

Deliver backend **safe query execution**: sqlglot-backed structural validation, Snowflake dispatch with timeouts and strict row ceilings, asyncio bounded concurrency and wait queues emitting **`warehouse_busy`**, Postgres-backed short-TTL **`cache_entries`** with permission re-validation on reads, **`query_audit_logs`** on every terminal path with at least **90-day** retention, and **`POST /workspaces/{workspace_id}/query/execute`** gated to internal roles (`admin`, `analyst`, `viewer`). **`external_client`** is barred until grant-first orchestration arrives.

Add a minimal protected **Run query** page under `apps/web` for harness-style verification—not Feature 5–6 authoring.

Decisions consolidate [research.md](research.md), the feature spec, and constitution v1.2.0 (Sections 7, 8.2, 3.3).

## Technical Context

**Language/Version**: Python 3.12 (`apps/api`), TypeScript 5.x (`apps/web`, `packages/types`)  
**Primary Dependencies**: FastAPI, Pydantic v2, SQLAlchemy 2.x + asyncpg, Alembic, sqlglot (Snowflake dialect), snowflake-connector-python, structlog; Feature 2–3 tenancy, Vault, connections modules  
**Storage**: Supabase Postgres for **`query_audit_logs`** and **`cache_entries`**; Snowflake for analytical reads via tenant connection resolver  
**Testing**: pytest + pytest-asyncio (parser goldens, concurrency and cache integration tests); optional Playwright/Vitest for minimal Run UI  
**Target Platform**: Linux containers per Feature 1 (Bunny Magic Containers)  
**Project Type**: pnpm Turborepo monorepo (`apps/web`, `apps/api`, shared `packages/`)  
**Performance Goals**: 30s warehouse ceiling per execution; MVP **5,000** row default fetch and **10,000** hard cap (§7.4); 10 concurrent Snowflake executions per API instance with up to ~25s wait for a slot (implementation plan baseline)  
**Constraints**: Backend-only credential access; bound parameters only (no literal concatenation); no secrets in audits; **`external_client`** never reaches validation or Snowflake in Feature 4  
**Scale/Scope**: Execute endpoint, audit + cache persistence, concurrency gate; excludes saved question CRUD, dashboard builder UX, synchronous CSV streaming

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Reference: [.specify/memory/constitution.md](../../.specify/memory/constitution.md) v1.2.0; [docs/implementation-plan.md](../../docs/implementation-plan.md) Feature 4.

| Topic | Status |
|-------|--------|
| §7 Raw SQL parser + warehouse SELECT posture | Pass — sqlglot policy + Vault-resolved SF role remain defense in depth |
| §7.4 timeouts and row limits | Pass — 30s / 5k default / 10k hard |
| §7.6 audit schema + 90-day retention | Pass — `query_audit_logs` |
| §3.3 cache TTLs, re-auth on read, invalidation | Pass — `cache_entries` + triggers in data-model |
| §8.2 concurrency + typed busy (not silent 5xx) | Pass — semaphore + bounded queue + `warehouse_busy` |
| §2 no durable BI warehouse data in app DB | Pass — only bounded TTL cache JSON |
| §9 backend owns execution and audit | Pass |

Note: audit `status` includes **`authz_denied`** and **`warehouse_busy`** in addition to §7.6 enumerations so API, UI, and analytics stay aligned with the feature spec.

**Gate result**: Pass. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/004-query-engine/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── README.md
│   └── query-execute.openapi.yaml
└── tasks.md             # Phase 2 (/speckit.tasks) — not created by /speckit.plan
```

### Source Code (repository root)

```text
apps/api/
├── app/
│   ├── query_engine/
│   │   ├── pipeline.py
│   │   ├── parser.py
│   │   ├── parameter_binding.py
│   │   ├── queue.py
│   │   ├── cache.py
│   │   └── snowflake_run.py
│   ├── models/query_engine.py
│   ├── routes/query.py
│   ├── db/migrations/versions/
│   └── main.py
└── tests/
    ├── unit/
    └── integration/

apps/web/app/
└── query-run/
    ├── page.tsx
    └── query-run-form.tsx

packages/types/src/
└── (generated or hand-written query execute DTOs)
```

**Structure Decision**: New FastAPI **`query_engine`** package keeps validation, cache, queue, and Snowflake execution cohesive. Routes depend on Feature 2 context and a thin **modality authorization** hook future features will extend. Next.js **`query-run`** is internal-only per FR-017.

## Complexity Tracking

> Fill only if constitution violations require justification.

No entries.

---

## Phase 0 - Outline and Research

See [research.md](research.md). Technical Context has no remaining **NEEDS CLARIFICATION** markers; research locks parser choice, binding strategy, numeric limits, cache identity, and caller-role rules from the clarification session.

---

## Phase 1 - Design and Contracts

- [data-model.md](data-model.md) — tables, indexes, retention, invalidation triggers.
- [contracts/query-execute.openapi.yaml](contracts/query-execute.openapi.yaml) — execute endpoint contract.
- [quickstart.md](quickstart.md) — migrate, smoke curl, concurrency and acceptance checklist.

---

## Post-Design Constitution Re-check

Artifacts preserve tenant isolation, parser plus least-privilege warehouse role, TTL cache as non-authoritative optimization, mandatory audit rows, deterministic overload handling, and internal-only callers for Feature 4.

**Gate result**: Pass.
