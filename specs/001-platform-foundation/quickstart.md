# Quickstart: Platform Foundation

**Feature**: 001-platform-foundation  
**Audience**: a platform engineer setting up local dev or running the first staging deploy.  
**Goal**: prove SC-001 — a fresh engineer can complete a staging deploy in under 30 minutes.

This quickstart describes the runtime behaviour the platform substrate provides. The repository already includes the initial monorepo and tooling substrate (for example, pnpm workspaces, Turbo, and shared packages under `packages/`); additional application scaffolding will continue to land via `/speckit.tasks` and `/speckit.implement`.

---

## 1. Prerequisites

Install once on your workstation:

- Git
- Node 20 LTS and `pnpm` 9
- Python 3.12 and `uv`
- Docker (for local Postgres and image builds)
- Access to:
  - the Bunny Magic Containers account (staging + production projects)
  - the Supabase Postgres connection string for staging and (separately) production
  - the GitHub repository with permission to push tags

After cloning, install the local commit hooks:

```bash
uv run --directory apps/api pre-commit install
```

## 2. Local bring-up (FR-003)

```bash
pnpm install                  # workspace install (web + shared packages)
uv sync --directory apps/api  # api deps via uv
cp .env.example .env          # placeholder values only — replace before running
docker compose up -d postgres # local Postgres for the api
uv run --directory apps/api alembic upgrade head

# in two terminals:
pnpm --filter web dev
uv run --directory apps/api uvicorn app.main:app --reload --port 8000
```

Verify locally:

```bash
curl -s http://localhost:8000/health  # → {"status":"ok"}
curl -s http://localhost:8000/ready   # → {"status":"ready"} when DB is up
curl -s http://localhost:3000/api/health  # → {"status":"ok"}
```

Each curl should return within the targets in SC-004 (≤ 100 ms for `/health`, ≤ 500 ms for `/ready`).

A request to either API endpoint should produce a structured log line that includes a `correlation_id`, and the same value should appear as the `X-Correlation-ID` response header (US3 acceptance scenario 3).

## 3. Configuration contract (FR-009, FR-010)

The full reference lives in `docs/env.md`. Phase 1 requires the following at minimum (names, not values):

- `DATABASE_URL` — application database connection string (api).
- `API_PUBLIC_URL` — public base URL of the API (web).
- `WEB_PUBLIC_URL` — public base URL of the web app (web, api).
- `LOG_LEVEL` — one of `debug | info | warn | error`. Optional; default `info`.
- `ENVIRONMENT` — `staging | production`. Required in deployed containers.

If any required variable is missing or empty, the affected container exits within 5 seconds with an explicit error (FR-010, SC-005):

```text
Missing required environment variable: DATABASE_URL
```

No secret values exist anywhere in the repository. `.env.example` contains placeholders only (FR-011).

## 4. First staging deploy (US1, SC-001)

1. On the `main` branch, create a release tag matching `vYYYY.MM.DD-N` (or your team's chosen scheme):

   ```bash
   git tag v2026.04.17-1
   git push origin v2026.04.17-1
   ```

2. The `release-staging` GitHub Actions workflow is triggered automatically. It performs, in order:

   1. Build images for `apps/web` and `apps/api`. Both are tagged with the release tag.
   2. Push images to the registry.
   3. Run the `migrate` one-shot container against the staging database (`alembic upgrade head`). Fail-fast on any non-zero exit.
   4. Roll out the API container on Bunny.
   5. Roll out the web container on Bunny.
   6. Hit `/health` and `/ready` on the new API and `/api/health` on the new web container as a post-deploy smoke check.

3. If step 3 fails, no rollout occurs. The previous staging API stays in service (US2 acceptance scenario 2). Investigate using the runbook at `ops/runbooks/deploy-staging.md`.

4. The workflow uses GitHub Actions concurrency `group: deploy-staging`, `cancel-in-progress: false`. A second deploy targeting staging while one is in flight will queue (FR-016).

## 5. Promote to production (FR-012)

The same release artifact promotes; **no rebuild**.

1. Open the `release-production` workflow in GitHub Actions.
2. Trigger it (workflow_dispatch) with the same release tag that succeeded in staging.
3. The workflow waits for an explicit human approval on the `production` GitHub Environment. A reviewer with production permissions clicks **Approve**.
4. The workflow runs migrations against production Postgres, then rolls the API, then the web container, then runs the same post-deploy smoke checks.
5. Concurrency for production is `group: deploy-production`, `cancel-in-progress: false`.

The runbook at `ops/runbooks/promote-production.md` documents who is allowed to approve and what they MUST verify in staging before approving (basic health, no error spike, manual smoke).

## 6. Rollback (FR-014, SC-006)

When a production deploy turns out to be bad:

1. Identify the last known-good release tag.
2. Trigger `release-production` with that earlier tag and approve it.
3. The same workflow re-rolls the previous immutable images. No fresh build is required.
4. If the new release applied a forward-only migration that the previous code cannot run against, follow the migration's documented forward-fix plan in the runbook (per FR-005, constitution §11.3).

Target: complete end-to-end within 10 minutes (SC-006).

## 7. Validating the substrate against the spec

Complete this section **after** an end-to-end pass against **staging** (or your designated pre-production environment). Tick each box only when you have observed the behaviour; record deviations as follow-up issues or runbook notes.

A simple manual checklist that maps directly to acceptance scenarios:

- [ ] **US1.1** Tagged release deploys both containers; both report healthy.
- [ ] **US1.2** Placeholder home page loads at the staging web URL.
- [ ] **US1.3** A failing build does not deploy.
- [ ] **US2.1** A valid migration is applied exactly once before the API rolls.
- [ ] **US2.2** A failing migration aborts the deploy; previous API stays up.
- [ ] **US2.3** Re-running the same release does not re-run an already-applied migration.
- [ ] **US3.1** `/health` returns within 100 ms locally and in staging.
- [ ] **US3.2** Stopping the database flips `/ready` to `not_ready` within 5 s.
- [ ] **US3.3** A request's correlation ID is present in logs and as `X-Correlation-ID`.
- [ ] **US4.1** A container with all required env starts healthy.
- [ ] **US4.2** A container missing a required env exits within 5 s with the variable's name in the error message.
- [ ] **US4.3** Repository contains no production-usable secret.
- [ ] **US4.4** Logs do not contain values of any secret-named env var.

When all items pass on staging for an end-to-end run, the foundation is ready and Feature 2 (auth + tenancy) may begin.
