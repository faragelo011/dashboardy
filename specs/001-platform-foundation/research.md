# Phase 0 Research: Platform Foundation

**Feature**: 001-platform-foundation  
**Date**: 2026-04-17  
**Status**: All Technical Context entries resolved. Zero `NEEDS CLARIFICATION` markers remain.

This document records the decisions made for the Phase 1 substrate, with rationale and the alternatives that were considered and rejected. The locked stack itself comes from [docs/implementation-plan.md](../../docs/implementation-plan.md) §2; this file restricts itself to the **why** for each choice as it relates to Phase 1 scope (a deployable substrate with health, logging, env contract, and migration pipeline — no domain features).

---

## R-001 Monorepo tool

- **Decision**: pnpm workspaces + Turborepo.
- **Rationale**: pnpm gives content-addressable installs (fast, low disk) and is the standard for Next.js 14 monorepos; Turborepo provides remote-cacheable, dependency-graph-aware task running for `lint`, `test`, `build` across `apps/*` and `packages/*`. This pairing is well-documented and supports the per-app Dockerfile pattern needed for two deployable units.
- **Alternatives considered**:
  - **npm workspaces** — works, but slower installs and no built-in task graph. Rejected because CI minutes matter for SC-002 (10-minute build target).
  - **Yarn (Berry) + Turborepo** — capable, but adds Plug'n'Play complexity that has friction with Python-side tooling and Docker context. Rejected as needless complexity.
  - **Nx** — more features than needed for an MVP with two apps; steeper learning curve. Rejected.

## R-002 Frontend framework

- **Decision**: Next.js 14 with App Router, TypeScript, Tailwind, shadcn/ui (skeleton only this phase).
- **Rationale**: The constitution names Next.js 14.x explicitly (§9.1). App Router gives server components for the future viewer/external-client experience and a clear file-system contract for placeholder routes in Phase 1.
- **Alternatives considered**: Pages Router — older, no benefit. Rejected.

## R-003 API framework and language

- **Decision**: FastAPI on Python 3.12, Pydantic v2, SQLAlchemy 2.x async + asyncpg, dependency management via `uv`.
- **Rationale**: Constitution §9.2 names FastAPI. Pydantic v2 + SQLAlchemy 2 async are the current generation. `uv` is faster than pip-tools / poetry and produces deterministic lockfiles, helpful for SC-002 (build-time target).
- **Alternatives considered**:
  - **poetry** — slower resolves, project-wide lock thrash. Rejected for speed.
  - **pip-tools** — older, more manual. Rejected.

## R-004 Migration tool

- **Decision**: Alembic.
- **Rationale**: Standard for SQLAlchemy projects; supports versioned, reversible migrations and a dedicated `alembic upgrade head` command suitable for a one-shot migration container before API rollout (FR-013). Reversibility maps directly to FR-005's "reversible OR documented forward-fix" rule (constitution §11.3).
- **Alternatives considered**:
  - **Supabase CLI migrations** — convenient when also using Supabase Edge Functions, but couples migration runs to the Supabase tool and is harder to drive from a release pipeline using the same Postgres URL the API uses. Rejected to keep migrations and runtime ORM in one ecosystem.
  - **Hand-rolled SQL files** — possible, but no rollback bookkeeping. Rejected.

## R-005 Migration execution shape in CI

- **Decision**: Dedicated one-shot `migrate` container (built from the API image, override entrypoint to `alembic upgrade head`) runs against the target environment's Postgres URL **before** the API container is rolled. Pipeline aborts on non-zero exit and does not replace the previous API container.
- **Rationale**: Directly satisfies FR-013 and US2 acceptance scenarios. Re-using the API image guarantees the migration code and dependencies match the code about to be deployed (no version drift).
- **Alternatives considered**:
  - **Run migrations inside API container at startup** — common but dangerous: if a rollout puts up multiple replicas, they race; if the migration is slow, readiness is delayed; if it fails, the new replica may crash-loop while the old one is already replaced. Rejected for FR-013 safety.
  - **Run from CI runner directly** — leaks DB credentials into the runner environment more broadly than necessary. Rejected.

## R-006 Hosting and per-environment isolation

- **Decision**: Bunny Magic Containers, two environments (staging, production), one container app per service per environment. Production rollout is a separate workflow that requires an explicit human approval (GitHub Actions `environment: production` with required reviewers).
- **Rationale**: Constitution §11 names Bunny. Manual approval implements the clarification recorded in [spec.md](spec.md) (FR-012). GitHub Actions `environments` feature provides the approval gate without a third-party tool.
- **Alternatives considered**:
  - **Auto-promote on staging green** — rejected during `/speckit.clarify` (Q1 → B).
  - **Separate production tag** — adds dual-tag cognitive load with no safety win once an approval gate exists. Rejected.

## R-007 Concurrency control per environment

- **Decision**: GitHub Actions `concurrency: { group: deploy-${{ env.target }}, cancel-in-progress: false }` on both staging and production deploy workflows.
- **Rationale**: Realises FR-016 directly: a second deploy against the same environment queues until the first completes; the in-flight deploy is **never** cancelled (cancellation mid-migration is the dangerous case). This implements the clarification recorded in spec.md (Q3 → C).
- **Alternatives considered**:
  - **`cancel-in-progress: true`** — risks aborting an in-progress migration. Rejected.
  - **No concurrency control** — allows parallel migrations against the same DB. Rejected (forbidden by FR-016).

## R-008 Logging substrate

- **Decision**: Structured JSON logs from the API via Python `structlog` (or stdlib `logging` with a JSON formatter such as `python-json-logger`); a per-request `correlation_id` injected by middleware, stored in a `contextvars.ContextVar`, included in every log event for the duration of the request, and returned to the caller as the `X-Correlation-ID` response header.
- **Rationale**: Satisfies FR-008 and US3 acceptance scenario 3 (single ID visible in both logs and response). Using `contextvars` works correctly with FastAPI's async stack. JSON output is parseable by any log aggregator that may be added later (deferred).
- **Alternatives considered**:
  - **`loguru`** — convenient, but adds a non-standard logging chain that interacts awkwardly with Uvicorn's loggers. Rejected.
  - **Plain text logs** — fails "structured" requirement. Rejected.

## R-009 Log destination and retention

- **Status**: **Deferred** to Phase 7 (Hardening) per the clarify session. Phase 1 commits only to producing well-structured stdout logs that any aggregator can later ingest. No log shipper is configured here.
- **Rationale**: This is operational policy that does not affect substrate code; postponing avoids choosing a vendor under-informed.

## R-010 Health and readiness semantics

- **Decision**:
  - `GET /health` (API liveness) — returns `200 {"status":"ok"}` if the process is responsive. No I/O. Target ≤ 100 ms p95 (SC-004).
  - `GET /ready` (API readiness) — runs a single short-timeout SQL `SELECT 1` against the application database; returns `200 {"status":"ready"}` if successful, `503 {"status":"not_ready","reason":"<short>"}` otherwise. Includes a 1-second internal timeout so failure detection happens well within the 5-second SC-004 budget.
  - **Web liveness** — `GET /api/health` on the Next.js app returns `200 {"status":"ok"}` from a Route Handler with no external calls.
- **Rationale**: Satisfies FR-006, FR-007, US3. Distinct liveness / readiness contracts let an orchestrator restart wedged processes without flapping under transient DB hiccups.
- **Alternatives considered**:
  - **Single combined endpoint** — collapses two operationally distinct signals; rejected.
  - **Cache the readiness result for N seconds** — reduces DB load but slows the 5-second flip requirement; rejected for Phase 1 simplicity.

## R-011 Configuration and fail-fast

- **Decision**: Pydantic Settings (`pydantic-settings`) for the API; `process.env`-driven `next.config.mjs` plus a runtime check at app startup for the web. Both apps **exit non-zero within 5 seconds** at startup if a required variable is missing or empty (FR-010, SC-005), with an error message of the form: `Missing required environment variable: <NAME>`. Required vs optional and their canonical names are documented in `docs/env.md` (FR-009).
- **Rationale**: Pydantic Settings has first-class env loading and built-in validation; failure mode is a single ValidationError that can be intercepted to print a clean message before exit.
- **Alternatives considered**:
  - **Lazy-load env on first use** — defers errors past startup, hides misconfig until it bites traffic. Rejected for FR-010.
  - **Read `.env` at runtime in production** — encourages bundling secrets in files. Rejected for FR-011.

## R-012 Secrets handling

- **Decision**: All secrets supplied via Bunny container environment variables (sourced from a managed credential store at deploy time). The repository contains `.env.example` only (placeholder values). A pre-commit hook plus CI step run a secret scanner against the diff and fail the build on hits. Application code MUST NOT log values of any environment variable whose name matches the secret-name allowlist (e.g., `*_KEY`, `*_SECRET`, `*_TOKEN`, `*_PASSWORD`, `*_URL` containing credentials).
- **Rationale**: Implements FR-011 + SC-007 with belt-and-braces: prevention (no secrets in repo), detection (scanner), and runtime (never log secret-named values).
- **Alternatives considered**:
  - **Read directly from Supabase Vault in this phase** — postponed to Feature 3 (connections). Phase 1 does not yet need to read from Vault. Rejected as premature.
  - **Bake secrets into images** — never. Rejected.

## R-013 Local development bring-up

- **Decision**: A single-command bring-up per app:
  - `pnpm --filter web dev` for the web app.
  - `uv run --directory apps/api uvicorn app.main:app --reload` for the API.
  - Plus `docker compose up -d postgres` (and `alembic upgrade head`) when a developer needs the DB.
- **Rationale**: Satisfies FR-003. Keeps the dev story honest (no hidden setup) without forcing every dev to spin up Bunny.
- **Alternatives considered**: A single `pnpm dev` orchestrator — more magic, harder to debug failures. Rejected.

## R-014 Testing tools

- **Decision**: pytest + pytest-asyncio + `httpx` (api), Vitest (web unit), Playwright (web smoke).
- **Rationale**: Conventional choices, well-supported by editors and CI. Phase 1 needs only:
  - api: `test_health`, `test_ready` (with mocked DB), `test_config_fail_fast`, `test_logging_correlation`.
  - web: smoke test that the placeholder home renders and the API base URL is exposed.
- **Alternatives considered**: None worth considering.

## R-015 Rollback procedure

- **Decision**: Rollback is "redeploy the previous known-good release tag" through the same `release-staging` / `release-production` workflows. Container images are immutable per tag and retained in the registry. The runbook at `ops/runbooks/rollback.md` documents the exact steps, including how to handle a schema that has moved forward (the runbook references the migration's documented forward-fix plan when present).
- **Rationale**: Satisfies FR-014 and SC-006 without inventing a separate rollback subsystem.
- **Alternatives considered**: Blue-green with two live container apps per env — too heavy for an MVP with two environments. Rejected for now; revisit at Phase 7 if needed.

## R-016 What is deferred

The following operational items are intentionally **out of Phase 1** and deferred to later phases / the Hardening phase:

- Log aggregation destination and retention (Phase 7).
- Metrics / tracing exporter (Phase 7; Sentry optional).
- Alerting rules on health flips and deploy failures (Phase 7).
- Read of secrets from Supabase Vault (Phase 3 — connections).
- Authentication, RBAC, and any tenancy logic (Phase 2).

---

**Outcome**: All Technical Context fields are concrete with no `NEEDS CLARIFICATION`. Phase 1 can proceed to design (Phase 1 outputs).
