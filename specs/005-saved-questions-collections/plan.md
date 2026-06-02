# Implementation Plan: Saved Questions and Collections

**Branch**: `005-saved-questions-collections` | **Date**: 2026-06-01 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/005-saved-questions-collections/spec.md`

## Summary

Deliver the Feature 5 authoring surface for **flat collections** and **saved questions**: tenant/workspace-scoped metadata tables, permission-filtered CRUD, `view`/`edit` internal grants with explicit widen-only question grants, external-client asset grant enforcement with separate export permission, scalar parameter schema validation, clone semantics that inherit the target collection, stale-update protection, saved-question execution through the Feature 4 query engine with cache invalidation and force-fresh bypass, and synchronous CSV export capped at 10,000 rows.

Frontend scope includes collection/question list and detail/editor flows, parameter editor for scalar declarations, run results table, clone, and CSV export affordances. It explicitly excludes dashboards, widgets, nested folders, scheduled/asynchronous export, comments, and version history.

Decisions consolidate [research.md](research.md), the clarified feature spec, constitution v1.2.0, and [docs/implementation-plan.md](../../docs/implementation-plan.md) Feature 5.

## Technical Context

**Language/Version**: Python 3.12 (`apps/api`), TypeScript 5.x (`apps/web`, `packages/types`)  
**Primary Dependencies**: FastAPI, Pydantic v2, SQLAlchemy 2.x + asyncpg, Alembic, existing auth/tenancy permission service, existing Feature 4 query engine DTOs and pipeline, Next.js 14 App Router, React 18, Tailwind/shadcn UI, Monaco for SQL editing  
**Storage**: Supabase Postgres for `collections`, `saved_questions`, `question_grants`, and updates to existing `collection_grants`/`asset_grants`; Snowflake remains the analytical data source through Feature 4 execution  
**Testing**: pytest + pytest-asyncio for API unit/integration/contract tests; Vitest or component tests for client helpers where useful; Playwright smoke for authoring loop  
**Target Platform**: Linux containers per Feature 1 (Bunny Magic Containers)  
**Project Type**: pnpm Turborepo monorepo (`apps/web`, `apps/api`, shared `packages/`)  
**Performance Goals**: Collection/question list and detail metadata responses should return within normal web interaction targets (<1s p95 locally/staging excluding auth cold start); saved-question execution inherits Feature 4 30s timeout and 5,000 default / 10,000 hard row caps; CSV export hard-caps at 10,000 rows  
**Constraints**: Backend-only authorization and database access; every resource tenant/workspace-scoped; no SQL or connection metadata exposed to external clients; scalar parameters only (`string`, `number`, `boolean`, `date`); saved-question SQL/parameter changes invalidate reusable cache entries; force-fresh execution uses cache bypass; no cascade delete of active questions when deleting a collection; stale updates rejected  
**Scale/Scope**: One flat collection level per workspace; CRUD/list/detail/clone/execute/export for saved questions; excludes dashboards, widgets, nested folders, version history, comments, non-CSV formats, and async export jobs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Reference: [.specify/memory/constitution.md](../../.specify/memory/constitution.md) v1.2.0; [docs/implementation-plan.md](../../docs/implementation-plan.md) Feature 5.

| Topic | Status |
|-------|--------|
| §4 / §15 tenant-bound resources | Pass — `collections`, `saved_questions`, and grants carry tenant/workspace scope and use permission-filtered access |
| §2 / §9 sensitive operations through backend | Pass — Next.js calls FastAPI only; frontend never writes Supabase app tables directly |
| §5 / §6 roles, access, inheritance | Pass — internal grants are `view`/`edit`, explicit question grants widen only, external clients use explicit per-asset grants |
| §6.1 Snowflake data access source of truth | Pass — saved questions delegate execution to Feature 4; app permissions do not replace Snowflake grants |
| §7.5 raw SQL constrained and bound parameters | Pass — authored SQL still flows through existing parser/binding pipeline; scalar parameter schema validates runtime values |
| §7.6 query execution logged | Pass — saved-question execute/export carries `saved_question_id` through Feature 4 audit logging |
| §7.4 CSV/manual export limits | Pass — synchronous CSV only, hard cap 10,000 rows, no async export jobs |
| §2 MVP scope / §15 scope creep rejected | Pass — dashboards, widgets, nested folders, comments, version history, and public sharing remain out of scope |

**Gate result**: Pass. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/005-saved-questions-collections/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── README.md
│   └── saved-questions.openapi.yaml
└── tasks.md             # Phase 2 (/speckit.tasks) — not created by /speckit.plan
```

### Source Code (repository root)

```text
apps/api/
├── app/
│   ├── questions/
│   │   ├── __init__.py
│   │   ├── authz.py
│   │   ├── repository.py
│   │   ├── schemas.py
│   │   ├── service.py
│   │   ├── parameters.py
│   │   └── csv_export.py
│   ├── models/
│   │   ├── auth_tenancy.py      # collection grant enum alignment if needed
│   │   └── saved_questions.py
│   ├── routes/
│   │   └── questions.py
│   ├── query_engine/            # reuse saved_question execution mode
│   ├── tenancy/permissions.py   # extend collection/question decisions
│   ├── admin/asset_grants_service.py
│   └── db/migrations/versions/
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

apps/web/app/
├── collections/
│   ├── page.tsx
│   ├── loading.tsx
│   └── collection-form.tsx
├── questions/
│   ├── page.tsx
│   ├── loading.tsx
│   ├── question-editor.tsx
│   ├── parameter-editor.tsx
│   └── results-table.tsx
└── lib/
    └── questions-api.ts

packages/types/src/
└── saved-questions.ts
```

**Structure Decision**: Add an `apps/api/app/questions` domain package for saved-question lifecycle, parameter validation, clone, execution orchestration, and CSV export. Keep authorization primitives in `tenancy` and query execution in `query_engine`. Add focused Next.js pages for collections/questions rather than extending the internal Feature 4 `/query-run` harness.

## Complexity Tracking

> Fill only if constitution violations require justification.

No entries.

---

## Phase 0 - Outline and Research

See [research.md](research.md). Technical Context has no unresolved clarification markers; research locks collection deletion behavior, collection-name uniqueness, permission levels, scalar parameter types, stale-update strategy, grant model alignment, and execution/export integration.

---

## Phase 1 - Design and Contracts

- [data-model.md](data-model.md) — tables, fields, indexes, validation rules, state transitions, and migration notes.
- [contracts/saved-questions.openapi.yaml](contracts/saved-questions.openapi.yaml) — collection and saved-question API contract including execute/export.
- [contracts/README.md](contracts/README.md) — contract scope and generation notes.
- [quickstart.md](quickstart.md) — migration, local smoke flow, and acceptance checklist.

---

## Post-Design Constitution Re-check

Artifacts preserve tenant/workspace isolation, backend-only sensitive operations, Feature 4 query safety and audit guarantees, Snowflake as data access source of truth, CSV cap requirements, external-client restrictions, and the explicit Feature 5-only scope boundary.

**Gate result**: Pass.
