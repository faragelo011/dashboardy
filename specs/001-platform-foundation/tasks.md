---
description: "Phase 1 implementation tasks — Platform Foundation"
---

# Tasks: Platform Foundation

**Input**: Design documents from [`/specs/001-platform-foundation/`](.)  
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Test tasks ARE included for this feature. The spec has explicit acceptance scenarios per user story (US1.1–US1.3, US2.1–US2.4, US3.1–US3.3, US4.1–US4.4) and measurable success criteria (SC-001..SC-007). Tests in this list are the minimum needed to verify those scenarios.

**Organization**: Tasks are grouped by user story (US1..US4) so each story can be implemented and tested independently.

**Audience**: this list is written for an implementing agent that may not have read the other artifacts. Each task names the **exact file path**, what to put in it, and a **Done when** check the agent can run to verify success without rereading other documents.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks).
- **[Story]**: Which user story (US1, US2, US3, US4). Setup, Foundational, and Polish tasks have no story label.
- Every task must include the exact file path it touches.

## Path Conventions

This is a monorepo (constitution §12). All paths are repository-relative.

- Web app: `apps/web/`
- API service: `apps/api/`
- Shared packages: `packages/{ui,types,config}/`
- Workflows: `.github/workflows/`
- Operations: `ops/`
- Docs: `docs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo scaffolding. No application code yet.

- [X] T001 [P] Create `.gitignore` at repo root containing standard Node, Python, OS, IDE, and Docker entries (at minimum: `node_modules/`, `.next/`, `dist/`, `__pycache__/`, `*.pyc`, `.venv/`, `.uv/`, `.env`, `.env.local`, `*.log`, `.DS_Store`, `.idea/`, `.vscode/` except `.vscode/settings.json`). **Done when**: `git status` no longer lists transient build artifacts.

- [X] T002 [P] Create `README.md` at repo root with project name "Dashboardy", a one-paragraph description, and a "Getting started" section linking to [`specs/001-platform-foundation/quickstart.md`](quickstart.md). **Done when**: file exists and renders on GitHub without warnings.

- [X] T003 Create `pnpm-workspace.yaml` at repo root with content:
  ```yaml
  packages:
    - "apps/*"
    - "packages/*"
  ```
  **Done when**: `pnpm install` (next task) accepts it.

- [X] T004 Create root `package.json` with `"private": true`, `"name": "dashboardy"`, `"packageManager": "pnpm@9.15.9"` (full semver — required by Turborepo’s `packageManager` parser), and scripts `"dev": "turbo dev"`, `"build": "turbo build"`, `"lint": "turbo lint"`, `"test": "turbo test"`. Add `"devDependencies": { "turbo": "^2" }`. Run `pnpm install`. **Done when**: `pnpm install` exits 0 and `node_modules/turbo/` exists.

- [X] T005 Create `turbo.json` at repo root with pipeline definitions for `build`, `lint`, `test`, `dev` (for `dev`, set `"cache": false, "persistent": true`). **Done when**: `pnpm dev` shows turbo's task graph (it will then idle because nothing is wired yet).

- [X] T006 [P] Create empty workspace package skeletons:
  - `packages/ui/package.json` with `{ "name": "@dashboardy/ui", "version": "0.0.0", "private": true, "main": "./dist/index.js", "types": "./src/index.ts", "scripts": { "build": "tsc -p tsconfig.json" }, "devDependencies": { "typescript": "^5.6.0" } }` plus `packages/ui/tsconfig.json` so `pnpm build` emits `dist/index.js`
  - `packages/types/package.json` with `{ "name": "@dashboardy/types", "version": "0.0.0", "private": true, "main": "./src/index.ts" }`
  - `packages/config/package.json` with `{ "name": "@dashboardy/config", "version": "0.0.0", "private": true }`
  - Add a placeholder `src/index.ts` with `export {}` in `ui/` and `types/`.
  
  **Done when**: `pnpm install` resolves the workspace links without errors.

- [X] T007 [P] Create `.env.example` at repo root with placeholder values (NO real secrets):
  ```dotenv
  # Safe template — replace angle-bracket placeholders; never commit a real `.env`.

  # --- API ---
  # DATABASE_URL (required): async PostgreSQL URL for SQLAlchemy + asyncpg.
  DATABASE_URL=postgresql+asyncpg://<DB_USER>:<DB_PASS>@<DB_HOST>:<DB_PORT>/<DB_NAME>

  # ENVIRONMENT (required): runtime environment name. Allowed: local | staging | production (extend as needed for your org).
  ENVIRONMENT=local

  # LOG_LEVEL (optional, default=info): API log verbosity (e.g. debug, info, warning, error).
  LOG_LEVEL=info

  # --- Web ---
  # API_PUBLIC_URL (required): browser- and server-side base URL for calling the API in this environment.
  API_PUBLIC_URL=http://localhost:8000

  # WEB_PUBLIC_URL (optional): public canonical URL of the web app (e.g. for links or callbacks). Omit if not used yet.
  WEB_PUBLIC_URL=http://localhost:3000
  ```
  **Done when**: file exists and `git diff --staged --quiet -- .env.example || true` finds no real credential pattern.

**Checkpoint**: pnpm workspace resolves; no application code yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Bare-minimum runnable web app, runnable API app, working migration tool, local Postgres, base CI. Nothing user-story-specific.

**CRITICAL**: No US1–US4 task may begin until this phase is complete.

- [X] T008 Initialize `apps/web` as a minimal Next.js 14 App Router project (TypeScript, Tailwind). Create:
  - `apps/web/package.json` with `"name": "@dashboardy/web"`, deps `next@^14`, `react@^18`, `react-dom@^18`, devDeps `typescript@^5`, `@types/react`, `@types/node`, `tailwindcss`, `postcss`, `autoprefixer`, `eslint`, `eslint-config-next`.
  - `apps/web/tsconfig.json` extending Next defaults.
  - `apps/web/next.config.mjs` exporting an empty config.
  - `apps/web/tailwind.config.ts` with `content: ["./app/**/*.{ts,tsx}"]`.
  - `apps/web/postcss.config.cjs`.
  - `apps/web/app/layout.tsx` (minimal HTML scaffold importing `./globals.css`).
  - `apps/web/app/globals.css` with `@tailwind base; @tailwind components; @tailwind utilities;`.
  - `apps/web/app/page.tsx` returning `<main className="p-8 text-lg">Dashboardy</main>` (placeholder, will be enhanced in T024).
  - `apps/web/.eslintrc.json` extending `next/core-web-vitals`.
  
  **Done when**: `pnpm --filter @dashboardy/web build` exits 0 AND `pnpm --filter @dashboardy/web dev` shows the placeholder at `http://localhost:3000`.

- [X] T009 Initialize `apps/api` as a Python 3.12 project managed by `uv`. Create:
  - `apps/api/pyproject.toml` with `[project]` name `dashboardy-api`, requires-python `>=3.12`, dependencies: `fastapi>=0.115`, `uvicorn[standard]>=0.32`, `pydantic>=2.9`, `pydantic-settings>=2.6`, `sqlalchemy[asyncio]>=2.0`, `asyncpg>=0.30`, `alembic>=1.14`, `structlog>=24.4`, `python-json-logger>=2.0`, `httpx>=0.27`. dev deps: `pytest>=8`, `pytest-asyncio>=0.24`, `ruff>=0.7`.
  - `apps/api/.python-version` with `3.12`.
  - `apps/api/app/__init__.py` (empty).
  - `apps/api/README.md` (one paragraph).
  
  Run `uv sync --directory apps/api`. **Done when**: `uv sync --directory apps/api` exits 0 and creates `apps/api/.venv/`.

- [X] T010 Create `apps/api/app/main.py` with a minimal FastAPI app and a lifespan context. Initial content:
  ```python
  from contextlib import asynccontextmanager
  from fastapi import FastAPI

  @asynccontextmanager
  async def lifespan(app: FastAPI):
      yield

  app = FastAPI(title="Dashboardy API", lifespan=lifespan)
  ```
  **Done when**: `uv run --directory apps/api uvicorn app.main:app --port 8000` starts and responds 404 to `GET /` (no routes yet, expected).

- [X] T011 Create `apps/api/app/config.py` with a basic Pydantic Settings class. Initial content (will be hardened in T040):
  ```python
  from functools import lru_cache

  from pydantic import field_validator
  from pydantic_settings import BaseSettings, SettingsConfigDict

  class Settings(BaseSettings):
      model_config = SettingsConfigDict(env_file=None, case_sensitive=True)

      DATABASE_URL: str
      ENVIRONMENT: str = "local"
      LOG_LEVEL: str = "info"

      @field_validator("DATABASE_URL")
      @classmethod
      def database_url_uses_asyncpg(cls, v: str) -> str:
          if "://" not in v:
              raise ValueError("DATABASE_URL must include a scheme (…://…)")
          scheme, _, _ = v.partition("://")
          if not scheme or not scheme.endswith("+asyncpg"):
              raise ValueError("DATABASE_URL scheme must end with +asyncpg")
          return v

  @lru_cache(maxsize=1)
  def get_settings() -> Settings:
      return Settings()  # raises ValidationError if required env missing
  ```
  **Done when**: `uv run --directory apps/api python -c "from app.config import get_settings; print(get_settings().ENVIRONMENT)"` prints the value of `ENVIRONMENT` when set.

- [X] T012 Create `apps/api/app/db/__init__.py` (empty) and `apps/api/app/db/session.py` with an async engine factory:
  ```python
  from functools import lru_cache

  from sqlalchemy.ext.asyncio import (
      AsyncEngine,
      AsyncSession,
      async_sessionmaker,
      create_async_engine,
  )

  from app.config import get_settings

  @lru_cache(maxsize=1)
  def get_engine() -> AsyncEngine:
      return create_async_engine(get_settings().DATABASE_URL, pool_pre_ping=True)

  @lru_cache(maxsize=1)
  def get_async_session_maker() -> async_sessionmaker[AsyncSession]:
      return async_sessionmaker(
          bind=get_engine(),
          expire_on_commit=False,
          class_=AsyncSession,
      )
  ```
  **Done when**: importing `app.db.session` does not raise.

- [X] T013 Configure Alembic in `apps/api`. Create:
  - `apps/api/alembic.ini` (standard template, set `script_location = app/db/migrations`).
  - `apps/api/app/models/__init__.py` with a SQLAlchemy `DeclarativeBase` subclass `Base` (for `target_metadata = Base.metadata` in Alembic).
  - `apps/api/app/db/migrations/env.py` with an **async** Alembic env: read `DATABASE_URL` from `app.config.get_settings()`, construct an **async** SQLAlchemy engine (`asyncpg`), and run migrations via Alembic’s asyncio API (e.g. `async with engine.begin(): …` / `run_async` / the official async `env.py` pattern — do not drive an async engine with synchronous `context.begin_transaction()`-only code paths).
  - `apps/api/app/db/migrations/versions/0001_baseline.py` — a no-op revision (revision id `0001`, down_revision `None`): declare `upgrade` and `downgrade` as **synchronous** `def` with bodies `pass` only (Alembic revision entrypoints stay sync; async work stays in `env.py` via the async engine and `connection.run_sync()` / `run_async` per Alembic’s async template).
  
  **Done when**:
  - `DATABASE_URL=... uv run --directory apps/api alembic current` exits 0.
  - `DATABASE_URL=... uv run --directory apps/api alembic upgrade head` exits 0 and creates the `alembic_version` table containing `0001`.

- [X] T014 [P] Create `apps/api/Dockerfile` — multi-stage, Python 3.12-slim base, install `uv`, copy `pyproject.toml` + lockfile, run `uv sync --frozen`, copy app, default `CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`. Expose 8000. Use a non-root user. **Done when**: `docker build -t dashboardy-api apps/api` succeeds locally.

- [X] T015 [P] Create `apps/web/Dockerfile` — multi-stage Node 20-alpine, install pnpm, build standalone Next.js output, final image runs `node server.js`. Expose 3000. Use a non-root user. (Reference: Next.js standalone output docs.) **Done when**: `docker build -t dashboardy-web apps/web -f apps/web/Dockerfile .` succeeds with the build context at repo root (so the workspace can be used).

- [X] T016 [P] Create `ops/docker-compose.yml` with a single `postgres:16-alpine` service exposing 5432, with env `POSTGRES_DB=dashboardy`, `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres`, and a named volume for data. **Done when**: `docker compose -f ops/docker-compose.yml up -d` starts Postgres and `psql` from the host can connect on `localhost:5432`.

- [X] T017 [P] Create `.github/workflows/ci.yml` triggered on `pull_request` and `push: branches: [main]`. It MUST:
  - Run `pnpm install --frozen-lockfile`, then `pnpm -r lint`, then `pnpm -r build`.
  - Run `uv sync --directory apps/api --frozen`, then `uv run --directory apps/api ruff check .`, then run `uv run --directory apps/api pytest -q` and **treat exit code 0 or 5 as success** (pytest uses **5** = no tests collected; fail the job for any other non-zero exit code). In the workflow step, temporarily disable `set -e`, capture pytest’s exit code, re-enable `set -e`, then exit 0 only when `ec` is 0 or 5 — match `.github/workflows/ci.yml`, for example:
    ```bash
    set +e
    uv run --directory apps/api pytest -q
    ec=$?
    set -e
    # pytest exit 5 = no tests collected; treat as success until API tests land (see T017).
    if [ "$ec" -eq 0 ] || [ "$ec" -eq 5 ]; then exit 0; fi
    exit "$ec"
    ```
  - Use Node 20, Python 3.12, and pnpm 9 in `setup-node` / `setup-python` / `pnpm/action-setup`.
  
  **Done when**: opening a PR triggers the workflow and all jobs pass.

**Checkpoint**: a developer can `pnpm dev` the web app, `uv run uvicorn` the API, and run `alembic upgrade head` against local Postgres. CI runs on PRs.

---

## Phase 3: User Story 1 — Deploy the platform to staging from a tagged release (P1)

**Story goal**: Cutting a release tag deploys both apps to staging with no manual steps until the production gate.

**Independent test**: Cut a release tag against a green main; observe both containers running and serving on the staging URLs. (Maps to spec [US1](spec.md), acceptance scenarios 1–3.)

### Implementation for User Story 1

- [X] T018 [US1] Add a baseline `GET /health` route stub to the API. Create `apps/api/app/routes/__init__.py` (empty) and `apps/api/app/routes/health.py`:
  ```python
  from fastapi import APIRouter

  router = APIRouter()

  @router.get("/health")
  async def health() -> dict:
      return {"status": "ok"}
  ```
  Then in `apps/api/app/main.py` add `from app.routes.health import router as health_router` and `app.include_router(health_router)`. **Done when**: `curl -s http://localhost:8000/health` returns `{"status":"ok"}`. (Latency contract is enforced in US3 — do not optimise yet.)

- [X] T019 [P] [US1] Add a web liveness route. Create `apps/web/app/api/health/route.ts`:
  ```ts
  import { NextResponse } from "next/server";
  export async function GET() {
    return NextResponse.json({ status: "ok" });
  }
  export const dynamic = "force-static";
  ```
  **Done when**: `curl -s http://localhost:3000/api/health` returns `{"status":"ok"}`.

- [X] T020 [US1] Update `apps/web/app/page.tsx` to render the placeholder home and display the resolved API base URL (read from `process.env.NEXT_PUBLIC_API_PUBLIC_URL`). Content:
  ```tsx
  export default function Home() {
    const apiUrl = process.env.NEXT_PUBLIC_API_PUBLIC_URL ?? "(unset)";
    return (
      <main className="p-8 text-lg">
        <h1 className="text-2xl font-semibold">Dashboardy</h1>
        <p className="text-sm text-gray-500">API: {apiUrl}</p>
      </main>
    );
  }
  ```
  Note: `NEXT_PUBLIC_API_PUBLIC_URL` is the public-safe variant (Next.js requires the `NEXT_PUBLIC_` prefix to expose to the browser). Document this rule in T042 (env reference). **Done when**: opening `http://localhost:3000` shows the heading and the API URL.

- [X] T021 [US1] Create `.github/workflows/release-staging.yml` triggered on `push: tags: ['v*']`. Steps in order:
  1. `actions/checkout@v4`
  2. Login to the container registry (`docker/login-action@v3`).
  3. `docker buildx build --push -t $REGISTRY/dashboardy-api:$TAG -t $REGISTRY/dashboardy-api:latest -f apps/api/Dockerfile apps/api`
  4. `docker buildx build --push -t $REGISTRY/dashboardy-web:$TAG -t $REGISTRY/dashboardy-web:latest -f apps/web/Dockerfile .`
  5. (Migration step is added in T026. Leave a placeholder comment for now.)
  6. Deploy API container to Bunny staging using the Bunny CLI / API call (use whatever official mechanism Bunny exposes; abstract the call into a step named "Deploy API to Bunny staging").
  7. Wait until the API container responds 200 to `GET /health` (curl with retries, max 60s).
  8. Deploy Web container to Bunny staging.
  9. Wait until the Web container responds 200 to `GET /api/health` (curl with retries, max 60s).
  
  Set `concurrency: { group: deploy-staging, cancel-in-progress: false }` at the workflow top level (this also satisfies part of US2's FR-016 requirement — see T027).  
  Use the GitHub `environment: staging` to scope the secrets used.  
  
  **Done when**: pushing a tag like `v0.0.1` triggers the workflow and both apps come up healthy on staging.

- [X] T022 [US1] Create `ops/runbooks/deploy-staging.md`. Content covers: prerequisites, exact tag format (recommend `vYYYY.MM.DD-N`), how to push the tag, how to watch the workflow, what to do if it fails (check the build job, then the deploy job, then `/health` retries), and the staging URLs. Target reading time ≤ 10 minutes (SC-001 ≤ 30 min total). **Done when**: another engineer can follow the runbook and complete a tag-deploy without asking questions.

### Tests for User Story 1

- [X] T023 [P] [US1] Create `apps/api/tests/__init__.py` (empty) and `apps/api/tests/test_health.py`:
  ```python
  from fastapi.testclient import TestClient
  from app.main import app

  def test_health_returns_ok():
      client = TestClient(app)
      r = client.get("/health")
      assert r.status_code == 200
      assert r.json() == {"status": "ok"}
  ```
  Add `[tool.pytest.ini_options] asyncio_mode = "auto"` to `apps/api/pyproject.toml` if not already set. **Done when**: `uv run --directory apps/api pytest tests/test_health.py -q` passes.

- [X] T024 [P] [US1] Create a Playwright smoke test at `apps/web/tests/smoke.spec.ts`:
  ```ts
  import { test, expect } from "@playwright/test";

  test("home renders heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboardy" })).toBeVisible();
  });
  ```
  Add Playwright config `apps/web/playwright.config.ts` (`webServer: { command: "pnpm dev", url: "http://localhost:3000", reuseExistingServer: true }`). Add `@playwright/test` as a devDependency. **Done when**: `pnpm --filter @dashboardy/web exec playwright test` passes.

**Checkpoint US1**: A push of a `v*` tag deploys both containers to staging. US1 acceptance scenarios 1, 2, 3 all pass.

---

## Phase 4: User Story 2 — Apply database migrations safely before rolling out the API (P1)

**Story goal**: Migrations run against the target DB before the API rolls; failure aborts cleanly; concurrent deploys serialize.

**Independent test**: Deliberately add a failing migration on a release tag → deploy aborts → previous API still up. Then fix and re-tag → applied exactly once. (Maps to spec [US2](spec.md), acceptance scenarios 1–4.)

### Implementation for User Story 2

- [X] T025 [US2] Add a one-shot migration entrypoint that reuses the API image. In `apps/api/Dockerfile` confirm the image already contains `alembic`, then document the override in a comment at the bottom: `# Migration job: docker run --rm -e DATABASE_URL=... <this-image> alembic upgrade head`. No new image is needed. **Done when**: `docker run --rm -e DATABASE_URL=$LOCAL_DB_URL dashboardy-api alembic upgrade head` exits 0 against local Postgres.

- [X] T026 [US2] Update `.github/workflows/release-staging.yml` (the placeholder added in T021 step 5). Insert a new job step **after** the API image push and **before** the API container deploy, named "Apply migrations to staging Postgres". The step must:
  - Use the just-pushed API image with override entrypoint: `docker run --rm -e DATABASE_URL=${{ secrets.STAGING_DATABASE_URL }} $REGISTRY/dashboardy-api:$TAG alembic upgrade head`
  - Use `timeout-minutes: 10` (matches FR-013 and the runbook's reasonable upper bound).
  - The workflow MUST fail and skip subsequent deploy steps if this step fails. (GitHub Actions behaves this way by default — do **not** add `continue-on-error`.)
  
  **Done when**: a deliberately-broken migration in a test branch causes the workflow to fail at this step and never reach the API deploy step (verifiable via the workflow run UI).

- [X] T027 [US2] Confirm that `concurrency: { group: deploy-staging, cancel-in-progress: false }` exists at the workflow top of `release-staging.yml` (added in T021). If absent, add it. **Done when**: triggering a second tag while the first deploy is mid-flight visibly queues the second run in the GitHub Actions UI rather than cancelling the first.

- [X] T028 [P] [US2] Create the production deploy workflow at `.github/workflows/release-production.yml`. It is `workflow_dispatch`-triggered with one input `tag` (string). Steps:
  1. `actions/checkout@v4`
  2. Use `environment: production` (this is the GitHub Environment that has **required reviewers** configured — see T051 for that one-time setup).
  3. Pull the **same** images that staging used: `$REGISTRY/dashboardy-api:${{ inputs.tag }}` and `$REGISTRY/dashboardy-web:${{ inputs.tag }}`. Do **not** rebuild.
  4. Run migrations: `docker run --rm -e DATABASE_URL=${{ secrets.PRODUCTION_DATABASE_URL }} $REGISTRY/dashboardy-api:${{ inputs.tag }} alembic upgrade head` (timeout 10 minutes, fail-fast).
  5. Deploy API container to Bunny production.
  6. Curl `/health` until 200 (max 60s).
  7. Deploy Web container to Bunny production.
  8. Curl `/api/health` until 200 (max 60s).
  
  Set `concurrency: { group: deploy-production, cancel-in-progress: false }` at the workflow top.  
  
  **Done when**: a workflow_dispatch with a known-good tag waits for an approver and, after approval, deploys to production using the same image tags.

- [X] T029 [P] [US2] Create a forward-fix-plan template at `apps/api/app/db/migrations/forward-fix-template.md`:
  ```markdown
  # Forward-fix plan for migration <revision_id>

  **When this is required**: the migration's `downgrade()` is unsafe or cannot reverse data loss.

  - Trigger condition: <describe the scenario that would prompt a forward-fix instead of a downgrade>
  - Proposed forward-fix migration: <describe what the next migration would do to recover>
  - Validation steps: <how to verify recovery in staging before applying to production>
  - On-call notification: <who to page>
  ```
  Add a sentence to `ops/runbooks/deploy-staging.md` saying "If a migration lacks a safe `downgrade()`, a sibling `<revision_id>.forward-fix.md` MUST be committed using the template at `apps/api/app/db/migrations/forward-fix-template.md`." **Done when**: file exists.

- [X] T030 [P] [US2] Create `ops/runbooks/promote-production.md` documenting the manual approval flow: who is authorised to approve, the staging signals to verify before approving (`/health`, `/ready`, no error spike, manual smoke), how to run the workflow_dispatch, what to do if production health checks fail (immediately re-run with the previous good tag — see T031). **Done when**: the runbook is internally consistent with [T028]'s workflow steps.

- [X] T031 [P] [US2] Create `ops/runbooks/rollback.md` documenting that rollback = re-run `release-production.yml` with the previous known-good `tag`. Include: how to identify the last good tag (`git tag --sort=-creatordate | head -10`), how to handle a forward-only migration (reference T029), and the SC-006 ≤ 10-minute target. **Done when**: the runbook is internally consistent with T028 and T029.

### Tests for User Story 2

- [X] T032 [P] [US2] Create `apps/api/tests/test_migrations_idempotent.py` that:
  - Stands up a **testcontainers** PostgreSQL instance (not SQLite) so the migration path matches production (`asyncpg` / Postgres runtime).
  - Runs `alembic upgrade head` **twice** via subprocess (each against the same container `DATABASE_URL`).
  - Asserts both invocations exit 0 and that **exactly one** row exists in `alembic_version` afterwards.
  
  **Done when**: `uv run --directory apps/api pytest tests/test_migrations_idempotent.py -q` passes locally (reviewers: validate Postgres + `alembic upgrade head` behavior, not SQLite).

**Checkpoint US2**: Migrations run before API rollout; failures abort cleanly; production deploys require approval and use the same artifact; concurrent deploys serialize. US2 acceptance scenarios 1–4 all pass.

---

## Phase 5: User Story 3 — Observe platform health and trace requests (P2)

**Story goal**: Hard latency targets on `/health`; real readiness probe; correlation IDs in logs and the response header.

**Independent test**: `/health` < 100 ms; cutting DB access flips `/ready` to 503 within 5s; a single request shows the same correlation ID in logs and `X-Correlation-ID`. (Maps to spec [US3](spec.md), acceptance scenarios 1–3.)

### Implementation for User Story 3

- [ ] T033 [US3] Create `apps/api/app/logging.py` with a JSON formatter and a correlation-id contextvar:
  ```python
  import logging, sys
  from contextvars import ContextVar
  from pythonjsonlogger import jsonlogger

  correlation_id_var: ContextVar[str | None] = ContextVar("correlation_id", default=None)

  class CorrelationIdFilter(logging.Filter):
      def filter(self, record: logging.LogRecord) -> bool:
          record.correlation_id = correlation_id_var.get()
          return True

  def configure_logging(level: str = "info") -> None:
      handler = logging.StreamHandler(sys.stdout)
      handler.setFormatter(jsonlogger.JsonFormatter(
          "%(asctime)s %(levelname)s %(name)s %(message)s %(correlation_id)s"
      ))
      handler.addFilter(CorrelationIdFilter())
      root = logging.getLogger()
      root.handlers.clear()
      root.addHandler(handler)
      root.setLevel(level.upper())
  ```
  **Done when**: importing the module does not raise.

- [ ] T034 [US3] Create `apps/api/app/middleware.py` with a Starlette middleware that reads or generates `X-Correlation-ID`, sets the contextvar, and writes the same header on the response:
  ```python
  import uuid
  from starlette.middleware.base import BaseHTTPMiddleware
  from starlette.requests import Request
  from app.logging import correlation_id_var

  HEADER = "X-Correlation-ID"

  class CorrelationIdMiddleware(BaseHTTPMiddleware):
      async def dispatch(self, request: Request, call_next):
          raw = request.headers.get(HEADER)
          if raw is None:
              cid = str(uuid.uuid4())
          else:
              try:
                  parsed = uuid.UUID(raw)
              except ValueError:
                  cid = str(uuid.uuid4())
              else:
                  cid = str(parsed) if parsed.version == 4 else str(uuid.uuid4())
          token = correlation_id_var.set(cid)
          try:
              response = await call_next(request)
          finally:
              correlation_id_var.reset(token)
          response.headers[HEADER] = cid
          return response
  ```
  **Done when**: importing the module does not raise.

- [ ] T035 [US3] Wire logging and middleware into `apps/api/app/main.py`. Update `lifespan` to call `configure_logging(get_settings().LOG_LEVEL)` on startup, and add `app.add_middleware(CorrelationIdMiddleware)`. **Done when**: `curl -i http://localhost:8000/health` shows an `X-Correlation-ID` response header AND the API stdout shows a JSON log line that includes the same `correlation_id` value.

- [ ] T036 [US3] Implement `GET /ready`. Create `apps/api/app/routes/ready.py`:
  ```python
  import asyncio
  from fastapi import APIRouter, Response, status
  from sqlalchemy import text
  from app.db.session import get_engine

  router = APIRouter()

  @router.get("/ready")
  async def ready(response: Response) -> dict:
      try:
          async with asyncio.timeout(1.0):
              engine = get_engine()
              async with engine.connect() as conn:
                  await conn.execute(text("SELECT 1"))
      except asyncio.TimeoutError:
          response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
          return {"status": "not_ready", "reason": "database_timeout"}
      except Exception:
          response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
          return {"status": "not_ready", "reason": "database_unreachable"}
      return {"status": "ready"}
  ```
  Then in `apps/api/app/main.py` add `from app.routes.ready import router as ready_router` and `app.include_router(ready_router)`. **Done when**: with Postgres up, `curl http://localhost:8000/ready` returns 200 `{"status":"ready"}`; with Postgres stopped, it returns 503 `{"status":"not_ready","reason":"database_unreachable"}`.

### Tests for User Story 3

- [ ] T037 [P] [US3] Create `apps/api/tests/test_ready.py` with two tests:
  - DB-up case: monkeypatch `get_engine()` to return an engine that successfully runs `SELECT 1`; assert 200 and `{"status":"ready"}`.
  - DB-down case: monkeypatch to raise; assert 503 and `{"status":"not_ready","reason":"database_unreachable"}`.
  
  **Done when**: `uv run --directory apps/api pytest tests/test_ready.py -q` passes.

- [ ] T038 [P] [US3] Create `apps/api/tests/test_logging_correlation.py` that:
  - Builds the FastAPI app once.
  - Sends a request with `X-Correlation-ID: 3fa85f64-5717-4562-b3fc-2c963f66afa6` (a valid UUIDv4).
  - Asserts the response `X-Correlation-ID` header equals the request value (normalized string form is acceptable if middleware canonicalizes via `uuid.UUID`).
  - Sends a request **without** the header and asserts the response header is a valid UUID.
  
  **Done when**: `uv run --directory apps/api pytest tests/test_logging_correlation.py -q` passes.

- [ ] T039 [P] [US3] Create `apps/api/tests/test_health_latency.py` — a non-flaky in-process latency check:
  - Hit `/health` 100 times via `TestClient` and measure wall time per call.
  - Assert the **median** is < 50 ms and the **max** is < 100 ms.
  
  **Done when**: the test passes on a developer laptop and in CI. (If CI is too slow, relax the max bound and document; the hard SLO is measured in staging via SC-004 black-box monitoring later.)

**Checkpoint US3**: Health/readiness/correlation contracts behave per [contracts/api-health.openapi.yaml](contracts/api-health.openapi.yaml). US3 acceptance scenarios 1–3 all pass.

---

## Phase 6: User Story 4 — Configure every environment safely through environment variables (P2)

**Story goal**: Required env is documented in one place, missing required env is fatal at startup with a named-variable error, and no secret leaks into the repo or logs.

**Independent test**: Deploy a container without `DATABASE_URL` → exits within 5 s with `Missing required environment variable: DATABASE_URL`; repo grep finds no real secrets; logs from a healthy run show no env values. (Maps to spec [US4](spec.md), acceptance scenarios 1–4.)

### Implementation for User Story 4

- [ ] T040 [US4] Harden `apps/api/app/config.py` to fail fast with a named-variable error message. Replace its body with:
  ```python
  import sys
  from pydantic import ValidationError
  from pydantic_settings import BaseSettings, SettingsConfigDict

  class Settings(BaseSettings):
      model_config = SettingsConfigDict(env_file=None, case_sensitive=True)
      DATABASE_URL: str
      ENVIRONMENT: str = "local"
      LOG_LEVEL: str = "info"

  def get_settings() -> Settings:
      try:
          return Settings()
      except ValidationError as e:
          missing = [
              str(err["loc"][0]) for err in e.errors()
              if err["type"] in ("missing", "string_type") or "required" in err["msg"].lower()
          ]
          for name in missing:
              print(f"Missing required environment variable: {name}", file=sys.stderr)
          if not missing:
              print(f"Invalid environment configuration: {e}", file=sys.stderr)
          sys.exit(2)
  ```
  Update `apps/api/app/main.py` to call `get_settings()` once at module import (or inside `lifespan` startup) so the process exits before serving traffic if env is wrong. **Done when**: `unset DATABASE_URL && uv run --directory apps/api uvicorn app.main:app` exits within 5 seconds and stderr contains exactly `Missing required environment variable: DATABASE_URL`.

- [ ] T041 [US4] Harden web env loading at startup. Create `apps/web/instrumentation.ts`:
  ```ts
  export async function register() {
    const required = ["API_PUBLIC_URL"];
    const missing = required.filter((k) => !process.env[k] || process.env[k] === "");
    if (missing.length) {
      for (const name of missing) {
        process.stderr.write(`Missing required environment variable: ${name}\n`);
      }
      process.exit(2);
    }
  }
  ```
  Add `experimental: { instrumentationHook: true }` to `apps/web/next.config.mjs` (Next 14 syntax). **Done when**: `unset API_PUBLIC_URL && pnpm --filter @dashboardy/web start` exits within 5 seconds with `Missing required environment variable: API_PUBLIC_URL` on stderr.

- [ ] T042 [US4] Create `docs/env.md` — the single environment-variable reference (FR-009). Sections: "API variables" (`DATABASE_URL` required, `ENVIRONMENT` required-in-deployed, `LOG_LEVEL` optional), "Web variables" (`API_PUBLIC_URL` required, `WEB_PUBLIC_URL` optional, `NEXT_PUBLIC_API_PUBLIC_URL` optional public mirror for browser code), "Deployment variables" (Bunny tokens, registry credentials — names only, never values), "Local development" (link to `.env.example`). **Done when**: file exists and every required variable named in the spec FR-009 / quickstart §3 is documented exactly once.

- [ ] T043 [US4] Add a secret-scan step to `.github/workflows/ci.yml`. Use `gitleaks/gitleaks-action@v2` with default config and `fail` on any finding. **Done when**: a deliberately-committed fake AWS key triggers a CI failure with a clear pointer to the line.

- [ ] T044 [US4] Add a pre-commit config at `.pre-commit-config.yaml` with `gitleaks` and `ruff` hooks. Add `pre-commit` to API dev deps and document `pre-commit install` in the root README and quickstart §1. **Done when**: `pre-commit run --all-files` runs both hooks locally.

### Tests for User Story 4

- [ ] T045 [P] [US4] Create `apps/api/tests/test_config_fail_fast.py`:
  - Spawn the API as a subprocess (`uv run uvicorn app.main:app --port <random>`) with `DATABASE_URL` unset and a 6-second wait timeout.
  - Assert the process exits within 5 seconds, exit code is non-zero, and stderr contains `Missing required environment variable: DATABASE_URL`.
  
  **Done when**: the test passes locally and in CI.

- [ ] T046 [P] [US4] Create `apps/api/tests/test_no_secret_in_logs.py`:
  - Set `DATABASE_URL=postgresql+asyncpg://probe:s3cret-do-not-leak@localhost:5432/x`, configure logging, log an info message, capture stdout, assert the substring `s3cret-do-not-leak` is NOT present.
  
  This validates the substrate's logger does not auto-dump environment values. **Done when**: the test passes.

**Checkpoint US4**: Env contract is enforced at startup; no secrets in repo or logs. US4 acceptance scenarios 1–4 all pass.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Wire everything together for SC-001..SC-007 verification. No new features.

- [ ] T047 [P] Update root `README.md` to link to: [`docs/env.md`](../../docs/env.md), [`specs/001-platform-foundation/quickstart.md`](quickstart.md), [`ops/runbooks/`](../../ops/runbooks). Add a "Required tooling" subsection (Node 20, pnpm 9, Python 3.12, uv, Docker). **Done when**: README contains all four links and they resolve.

- [ ] T048 [P] Add `lint` and `test` scripts to `apps/web/package.json` (`"lint": "next lint"`, `"test": "vitest run"`) and ensure both are wired through `turbo.json` so `pnpm lint` and `pnpm test` exercise the web app. (Vitest is added if not already present; otherwise use Playwright `--project=ci` for the smoke test.) **Done when**: `pnpm test` from repo root runs the web smoke test and the API pytest suite.

- [ ] T049 [P] Create `ops/runbooks/README.md` listing the runbooks (`deploy-staging.md`, `promote-production.md`, `rollback.md`) with one-line descriptions. **Done when**: the file exists and links work.

- [ ] T050 Write release-tag convention into [`docs/env.md`](../../docs/env.md) (a "Release tags" section). Convention: `vYYYY.MM.DD-N` where N starts at 1 each day. **Done when**: convention documented; consistent with the example in T022's runbook.

- [ ] T051 Configure GitHub Environments (one-time, manual UI step — but **document this** so it is not forgotten). Create `ops/runbooks/github-environments-setup.md` documenting: create `staging` Environment (no required reviewers); create `production` Environment **with required reviewers** (the platform team); attach `STAGING_DATABASE_URL`, `PRODUCTION_DATABASE_URL`, registry credentials, and Bunny credentials to the appropriate environment. **Done when**: runbook exists and the production environment in the GitHub UI shows ≥ 1 required reviewer.

- [ ] T052 Run [quickstart.md](quickstart.md) §7 end-to-end against staging once. Tick every box in the validation checklist. Record any deviations as follow-up items. **Done when**: all 13 checkboxes in quickstart §7 are ticked on a printed copy, screenshot, or a task-tracker comment.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup completion — BLOCKS all user stories.
- **US1, US2, US3, US4 (Phases 3–6)**: each depends on Foundational. They are individually testable but share files (notably `.github/workflows/release-staging.yml`, `apps/api/app/main.py`, `apps/api/app/config.py`), so see "Within each user story" below for in-story serialisation.
- **Polish (Phase 7)**: depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)** must precede **US2 (P1)** in calendar order because US2 modifies the `release-staging.yml` workflow that US1 creates. Same vertical, two slices.
- **US3 (P2)** is independent of US1/US2 — it edits `main.py`, `logging.py`, `middleware.py`, `routes/ready.py`. It can start as soon as Foundational is done.
- **US4 (P2)** is independent of US1/US2/US3 — it edits `config.py`, `instrumentation.ts`, `docs/env.md`, `.github/workflows/ci.yml`, `.pre-commit-config.yaml`. It can start as soon as Foundational is done.

### Within Each User Story

- Tests can run in parallel ([P]) when they touch different files.
- Implementation tasks that modify the same file (e.g., `apps/api/app/main.py` is modified by T010, T018, T035, T036, T040) MUST be done in numeric order.
- The runbooks and forward-fix template (T029, T030, T031) can be drafted in parallel since they are different files.

### Parallel Opportunities

- All Setup tasks marked [P]: T001, T002, T006, T007.
- All Foundational tasks marked [P]: T014, T015, T016, T017.
- US1 parallelizable tasks: T019, T023, T024 (all touch different files).
- US2 parallelizable tasks: T028, T029, T030, T031, T032 (all different files).
- US3 parallelizable tasks: T037, T038, T039.
- US4 parallelizable tasks: T045, T046.
- Polish: T047, T048, T049 are all parallelizable.

---

## Parallel Example: User Story 3

```bash
# Once T033, T034, T035, T036 are done, the three test tasks can run together:
Task: "T037 [P] [US3] Tests for /ready in apps/api/tests/test_ready.py"
Task: "T038 [P] [US3] Tests for correlation-id in apps/api/tests/test_logging_correlation.py"
Task: "T039 [P] [US3] Latency test in apps/api/tests/test_health_latency.py"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1 Setup (T001–T007).
2. Complete Phase 2 Foundational (T008–T017).
3. Complete Phase 3 US1 (T018–T024).
4. **STOP and validate**: cut a tag, watch staging come up. This proves the deploy substrate works even before migrations are wired.

### Incremental delivery

1. Setup + Foundational → ready.
2. US1 (T018–T024) → MVP staging deploy works.
3. US2 (T025–T032) → migrations gated; production approval; rollback; concurrency.
4. US3 (T033–T039) → strict latency, real readiness, correlation IDs.
5. US4 (T040–T046) → env contract enforced; secret hygiene proven.
6. Polish (T047–T052) → quickstart validation; documented release-tag convention.

### Parallel team strategy

After Foundational:

- Engineer A: US1 then US2 (sequential — share workflow files).
- Engineer B: US3 (independent file set).
- Engineer C: US4 (independent file set).

---

## Notes

- `[P]` means **different files, no dependency on incomplete tasks**.
- `[Story]` is required on every Phase-3-onward task except Polish.
- Each task's "**Done when**" check is the only signal needed — no out-of-band acceptance review.
- Commit after each task with message format `[T###] short description`.
- If a "Done when" check fails, fix in place; do not advance.
- Avoid: editing files outside the task's named paths, adding deps not listed in the task, introducing scope from later phases (e.g., do not add `tenants` table here — Feature 2 owns that per [docs/implementation-plan.md](../../docs/implementation-plan.md) §2.3).

---

## Validation summary

- Total tasks: **52**
- Tasks per user story: US1 = 7 (T018–T024), US2 = 8 (T025–T032), US3 = 7 (T033–T039), US4 = 7 (T040–T046)
- Setup: 7 (T001–T007). Foundational: 10 (T008–T017). Polish: 6 (T047–T052).
- Independent test criteria for each user story: stated at the top of each phase ("Independent test").
- Suggested MVP scope: **US1 only** (cut a tag → staging up; sufficient to demo).
- Format check: each task line starts with `- [ ]` (or `- [X]` for completed tasks), includes a sequential `T###` ID, includes `[P]` only when truly file-disjoint, includes a `[US#]` label only in Phases 3–6, and names exact file paths.
