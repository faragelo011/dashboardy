# Implementation Plan: Platform Foundation

**Branch**: `001-platform-foundation` | **Date**: 2026-04-17 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/001-platform-foundation/spec.md`

## Summary

Phase 1 establishes the deployable platform shell: a `pnpm` + Turborepo monorepo with two Docker-packaged applications (a Next.js web app and a FastAPI service), a versioned Alembic migration pipeline against Supabase Postgres, structured JSON logging with per-request correlation IDs, an enforced environment-variable contract, liveness and readiness endpoints, and a GitHub Actions workflow that builds images, applies migrations, deploys to staging on every release tag, and gates production behind a manual approval. No domain features yet — the goal is a safe, observable, repeatable deploy substrate for Phases 2 through 6.

The technical approach is locked in [docs/implementation-plan.md](../../docs/implementation-plan.md) §2 (stack) and §4 Feature 1 (scope), and is consistent with the constitution v1.2.0. There are no `NEEDS CLARIFICATION` items.

## Technical Context

**Language/Version**: TypeScript 5.x (web), Python 3.12 (api)  
**Primary Dependencies**: Next.js 14 (App Router), Tailwind, shadcn/ui, `@supabase/ssr` (auth-only, scaffolded but unused this phase); FastAPI, Pydantic v2, SQLAlchemy 2.x, asyncpg, Alembic, structlog (or stdlib `logging` with JSON formatter)  
**Storage**: Supabase Postgres (application metadata DB); no domain tables yet — only Alembic version table + a connectivity-probe path for readiness  
**Testing**: pytest + pytest-asyncio (api), Vitest (web unit), Playwright (web smoke)  
**Target Platform**: Linux containers on Bunny Magic Containers; staging and production environments only  
**Project Type**: Web application (monorepo with `apps/web` + `apps/api` + shared `packages/`)  
**Performance Goals**: API liveness ≤ 100 ms p95 normal conditions (SC-004); readiness ≤ 500 ms p95 normal conditions and ≤ 5 s flip on DB loss (SC-004); main-merge to deployable artifact within 10 minutes for ≥ 95% of runs (SC-002)  
**Constraints**: No secrets in repo or logs (FR-011, SC-007); single deploy in flight per environment (FR-016); migration must precede API rollout and gate it (FR-013); production rollout requires manual approval (FR-012)  
**Scale/Scope**: 2 environments (staging, production); 2 deployable apps; ~10 environment variables; 0 domain entities; ~3 endpoints (`/health`, `/ready`, web liveness)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.2.0 — [.specify/memory/constitution.md](../../.specify/memory/constitution.md). Phase 1 introduces no application data, no SQL execution, no permissions, no connections. Most non-negotiables therefore apply only as **forward-compatibility constraints** on the substrate, not as features.

| # | Non-Negotiable | Phase 1 status |
|---|----------------|----------------|
| 1 | Every resource tenant-bound | N/A (no resources yet); future schema will use `tenant_id` |
| 2 | Sensitive ops through backend | **Pass forward**: web app scaffolded with API as the only backend; no direct Supabase data-client wiring |
| 3 | Snowflake = data SoT | N/A (no Snowflake in this phase) |
| 4 | Raw SQL constrained | N/A |
| 5 | Query execution logged | N/A; logging substrate proven this phase via correlation IDs |
| 6 | No BI data in app DB | **Pass**: only Alembic version + future cache table; no warehouse data here |
| 7 | No shared connections across tenants | N/A |
| 8 | Authors vs consumers | N/A |
| 9 | Scope creep rejected | **Pass**: spec contains no out-of-MVP additions |

Constitution §11 (Deployment Rules) directly governs this phase and is implemented as:

- §11.1 staging + production environments — FR-015.
- §11.2 environment-based config, health endpoints, structured logging, deploy reproducibility, rollback path, secrets through env only — FR-006/007/008/009/010/011/014.
- §11.3 versioned, repo-committed migrations applied identically to staging and production; reversible-or-forward-fix — FR-004/005/013.

§14.1 build-order discipline: this is Feature 1 in the constitution's authoritative sequence (foundation → auth+tenancy → connections → query engine → saved questions → dashboards). No skipping.

**Gate result**: Pass. No constitutional violations to justify in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-platform-foundation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (health/ready/web-liveness)
└── tasks.md             # Phase 2 output (NOT created here)
```

### Source Code (repository root)

```text
apps/
├── web/                          # Next.js 14 App Router
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Placeholder home (FR-010 acceptance, US1.2)
│   │   └── api/
│   │       └── health/route.ts   # Web liveness (FR-007)
│   ├── public/
│   ├── package.json
│   ├── next.config.mjs
│   ├── Dockerfile
│   └── tests/
│       └── smoke.spec.ts         # Playwright: home renders
└── api/                          # FastAPI service
    ├── app/
    │   ├── __init__.py
    │   ├── main.py               # FastAPI app + lifespan + middleware wiring
    │   ├── config.py             # Pydantic Settings — fails fast on missing env (FR-010)
    │   ├── logging.py            # JSON formatter + correlation-id contextvar
    │   ├── middleware.py         # Correlation-ID injection / response header
    │   ├── routes/
    │   │   ├── health.py         # GET /health (FR-006 liveness)
    │   │   └── ready.py          # GET /ready (FR-006 readiness via DB ping)
    │   └── db/
    │       ├── session.py        # asyncpg engine factory
    │       └── migrations/       # Alembic env + versions/
    │           ├── env.py
    │           └── versions/
    │               └── 0001_baseline.py   # No-op or alembic_version only
    ├── pyproject.toml            # uv-managed deps
    ├── Dockerfile
    ├── alembic.ini
    └── tests/
        ├── test_health.py
        ├── test_ready.py
        ├── test_config_fail_fast.py
        └── test_logging_correlation.py

packages/
├── ui/                           # Shared shadcn/ui primitives (skeleton only this phase)
│   └── package.json
├── types/                        # Shared TS types (skeleton; OpenAPI-generated later)
│   └── package.json
└── config/                       # Shared TS config (eslint, ts, tailwind preset)
    └── package.json

.github/
└── workflows/
    ├── ci.yml                    # Lint + test on PRs and main pushes (FR-002)
    ├── release-staging.yml       # On release tag → build images → migrate → deploy staging (FR-012, FR-013)
    └── release-production.yml    # Manual-approval workflow — same artifact (FR-012, FR-016 concurrency lock)

docs/
├── implementation-plan.md        # (existing) master plan
└── env.md                        # NEW — single env-var reference (FR-009)

ops/
├── docker-compose.yml            # Local bring-up (FR-003)
└── runbooks/
    ├── deploy-staging.md         # SC-001: 30-minute first-deploy procedure
    ├── promote-production.md     # FR-012 manual approval steps
    └── rollback.md               # FR-014, SC-006

pnpm-workspace.yaml
turbo.json
package.json
README.md
```

**Structure Decision**: Web application (multi-app monorepo). Two deployable units (`apps/web`, `apps/api`) plus shared `packages/` per constitution §12. Domain modules (`auth_context`, `tenancy`, `connections`, `query_engine`, `questions`, `dashboards`, `admin`, `system`) from [docs/implementation-plan.md](../../docs/implementation-plan.md) §2.3 are **not** created in Phase 1; only the substrate above is scaffolded so later features land cleanly.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified.

No violations. Section intentionally empty.

---

## Phase 0 — Outline & Research

See [research.md](research.md). All Technical Context entries are resolved; the document records the rationale for each locked decision and the alternatives considered.

## Phase 1 — Design & Contracts

- [data-model.md](data-model.md) — explains why no domain entities are introduced in this phase and lists the substrate-only schema (Alembic version table) as a forward-compatibility note.
- [contracts/](contracts/) — OpenAPI for `/health` and `/ready`, and a brief contract for the web liveness route.
- [quickstart.md](quickstart.md) — developer bring-up + first staging deploy walkthrough.

## Post-Design Constitution Re-check

After producing the artifacts above, no design decision contradicts the constitution. The substrate stays inside §11 Deployment Rules and respects §14.1 build-order. Gate result: **Pass**.

## Stop

Per the `/speckit.plan` workflow, this command stops here. Task generation (`tasks.md`) is the responsibility of `/speckit.tasks`.
