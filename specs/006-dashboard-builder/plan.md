# Implementation Plan: Dashboard Builder

**Branch**: `006-dashboard-builder` | **Date**: 2026-06-29 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/006-dashboard-builder/spec.md`

## Summary

Deliver Feature 6 **dashboard authoring and consumption**: tenant/workspace-scoped `dashboards`, normalized `dashboard_widgets`, and `dashboard_grants`; permission-filtered CRUD and clone; dashboard-global filters with explicit per-widget parameter bindings and visible per-widget overrides (no widget-local-only filters); widget execution and table-widget CSV export through the existing Feature 4 `widget` query-engine mode with merged filter state, `filter_state_hash`, cache correctness, and audit attribution; auto-refresh of bound widgets on global filter change; and safe viewer/external-client consumption without SQL or connection metadata exposure.

Frontend scope includes dashboard list, grid-based builder, filter bar, override indicators, viewer layout, Recharts presentations for KPI/bar/line, client-side table paging, and parallel widget refresh orchestration. It excludes new saved-question authoring, unsupported widget types, widget-local-only filters, nested collections, scheduled delivery, and async export.

Decisions consolidate [research.md](research.md), clarified [spec.md](spec.md), constitution v1.2.0, and [docs/implementation-plan.md](../../docs/implementation-plan.md) Feature 6.

## Technical Context

**Language/Version**: Python 3.12 (`apps/api`), TypeScript 5.x (`apps/web`, `packages/types`)  
**Primary Dependencies**: FastAPI, Pydantic v2, SQLAlchemy 2.x + asyncpg, Alembic, existing auth/tenancy permission service, Feature 4 query engine (`widget` mode, cache identity, TTL classes), Feature 5 saved-question parameter validation, Next.js 14 App Router, React 18, Tailwind/shadcn UI, Recharts, TanStack Query, Zustand (dashboard filter/UI state)  
**Storage**: Supabase Postgres for `dashboards`, `dashboard_widgets`, `dashboard_grants`; reuse existing `asset_grants` for external-client dashboard access/export; dashboard `definition` JSONB for global filters and layout metadata; Snowflake via Feature 4 only  
**Testing**: pytest + pytest-asyncio for API unit/integration/contract tests; Vitest for filter-merge and layout helpers; Playwright smoke for builder and consumer flows  
**Target Platform**: Linux containers per Feature 1 (Bunny Magic Containers)  
**Project Type**: pnpm Turborepo monorepo (`apps/web`, `apps/api`, shared `packages/`)  
**Performance Goals**: Dashboard shell first render <2s; standard dashboard (≤6 widgets) interactive <5s when queries are within normal limits; per-widget render <1s after data arrives (constitution §8.1); widget execution inherits Feature 4 30s timeout and row caps; table CSV export hard-caps at 10,000 rows  
**Constraints**: Backend-only authorization and database access; every resource tenant/workspace-scoped; global filter change auto-refreshes bound widgets immediately; filter state must affect cache keys; hidden overrides forbidden; external clients require explicit `asset_grants`; dashboard titles unique per collection; stale dashboard updates rejected; KPI/bar/line have no CSV export  
**Scale/Scope**: Flat collections; KPI/bar/line/table widgets only; dashboard CRUD/list/detail/clone; per-widget execute and table export; excludes widget-local-only filters, nested folders, comments, version history, and public sharing

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Reference: [.specify/memory/constitution.md](../../.specify/memory/constitution.md) v1.2.0; [docs/implementation-plan.md](../../docs/implementation-plan.md) Feature 6.

| Topic | Status |
|-------|--------|
| §4 / §15 tenant-bound resources | Pass — `dashboards`, `dashboard_widgets`, and `dashboard_grants` carry tenant/workspace scope |
| §2 / §9 sensitive operations through backend | Pass — Next.js calls FastAPI only; no Supabase app-table client on web |
| §5 / §6 roles, access, inheritance | Pass — collection inheritance + `view`/`edit` dashboard grants widen only; external clients use explicit per-dashboard `asset_grants` |
| §6.1 Snowflake data access source of truth | Pass — widgets delegate execution to Feature 4; app permissions do not replace Snowflake grants |
| §7.5 bound parameters for filters | Pass — global filters and overrides merge into declared saved-question parameters before execution |
| §7.6 query execution logged | Pass — widget executes carry `dashboard_id`, `widget_id`, and `saved_question_id` through audit |
| §7.7 filter model | Pass — global filters, explicit bindings, visible overrides, no silent bind, filter-state cache invalidation |
| §7.4 table pagination + CSV limits | Pass — client-side paging over capped result set; synchronous table CSV only, 10,000-row cap |
| §3.3 cache rules | Pass — widget mode uses `filter_state_hash`; definition/binding/override changes invalidate cache |
| §2 MVP scope / §15 scope creep rejected | Pass — unsupported chart types, widget-local-only filters, and async export remain out of scope |

**Gate result**: Pass. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/006-dashboard-builder/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── README.md
│   └── dashboards.openapi.yaml
└── tasks.md             # Phase 2 (/speckit.tasks) — not created by /speckit.plan
```

### Source Code (repository root)

```text
apps/api/
├── app/
│   ├── dashboards/
│   │   ├── __init__.py
│   │   ├── authz.py
│   │   ├── repository.py
│   │   ├── schemas.py
│   │   ├── service.py
│   │   ├── filters.py          # merge global + bindings + overrides; filter_state_hash
│   │   ├── clone.py
│   │   └── csv_export.py       # table widget export via widget execution path
│   ├── models/
│   │   └── dashboards.py
│   ├── routes/
│   │   └── dashboards.py
│   ├── query_engine/           # reuse widget execution mode
│   ├── questions/              # saved question lookup + parameter schema
│   ├── tenancy/permissions.py  # extend dashboard collection/grant decisions
│   └── db/migrations/versions/
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

apps/web/app/
├── dashboards/
│   ├── page.tsx                # list
│   ├── loading.tsx
│   ├── [dashboardId]/
│   │   ├── page.tsx            # viewer
│   │   ├── edit/page.tsx       # builder
│   │   ├── dashboard-filter-bar.tsx
│   │   ├── dashboard-grid.tsx
│   │   └── widgets/
│   │       ├── kpi-widget.tsx
│   │       ├── bar-widget.tsx
│   │       ├── line-widget.tsx
│   │       └── table-widget.tsx
└── lib/
    └── dashboards-api.ts

packages/types/src/
└── dashboards.ts
```

**Structure Decision**: Add an `apps/api/app/dashboards` domain package for dashboard lifecycle, widget configuration, filter merge/hash, clone, widget execute orchestration, and table CSV export. Keep authorization primitives in `tenancy`, saved-question parameter validation in `questions`, and warehouse execution in `query_engine`. Add focused Next.js routes for dashboard list, builder, and viewer with client-side filter orchestration and Recharts rendering.

## Complexity Tracking

> Fill only if constitution violations require justification.

No entries.

---

## Phase 0 - Outline and Research

See [research.md](research.md). Technical Context has no unresolved clarification markers; research locks storage shape, filter merge semantics, execution integration, auto-refresh orchestration, permission model, clone behavior, CSV export scope, and frontend grid/chart approach.

---

## Phase 1 - Design and Contracts

- [data-model.md](data-model.md) — tables, JSON definition shape, indexes, validation rules, and migration notes.
- [contracts/dashboards.openapi.yaml](contracts/dashboards.openapi.yaml) — dashboard, widget, execute, and export API contract.
- [contracts/README.md](contracts/README.md) — contract scope and generation notes.
- [quickstart.md](quickstart.md) — migration, local smoke flow, and acceptance checklist.

---

## Post-Design Constitution Re-check

Artifacts preserve tenant/workspace isolation, backend-only sensitive operations, Feature 4 query safety and audit guarantees, §7.7 filter visibility and cache correctness, table pagination and CSV cap requirements, external-client restrictions, and the explicit Feature 6-only scope boundary.

**Gate result**: Pass.
