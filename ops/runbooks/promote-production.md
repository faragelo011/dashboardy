# Promote a release to production

This runbook documents the manual approval flow for promoting a previously-tagged, staging-validated release to production.

## Who can approve

Only engineers explicitly configured as **required reviewers** on the GitHub Environment named `production` are authorized to approve a production deployment.

## What to verify in staging before approving

Minimum signals:

- API health is green: `GET /health` returns 200.
- API readiness is green: `GET /ready` returns 200.
- No obvious error spike in your logs/monitoring.
- Manual smoke check of the web app homepage and key navigation (basic load + liveness route).

## How to run the production workflow

1. Open GitHub Actions → workflow `release-production`.
2. Click **Run workflow**.
3. Set input `tag` to the exact release tag that succeeded in staging (e.g. `v2026.04.26-1`).
4. The workflow will pause waiting for the `production` environment approval.
5. A required reviewer clicks **Approve and deploy**.

## What the workflow does (high level)

It performs, in order:

1. Pulls the same images that were built for staging (no rebuild).
2. Applies migrations against the production database (fail-fast).
3. Deploys the API container to Bunny production.
4. Waits for `GET /health` to return 200.
5. Deploys the Web container to Bunny production.
6. Waits for `GET /api/health` to return 200.

## If production health checks fail

Treat this as a failed rollout. Immediately roll back by re-running the workflow with the previous known-good tag.

See `ops/runbooks/rollback.md`.

