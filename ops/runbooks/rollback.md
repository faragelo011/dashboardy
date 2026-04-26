# Rollback production

Rollback is performed by re-running the production release workflow with a previously known-good release tag.

Target: complete end-to-end within 10 minutes (SC-006).

## Identify the last known-good tag

From a local clone:

```bash
git tag --sort=-creatordate | head -10
```

Pick the most recent tag that was known to be healthy in production.

## Execute rollback

1. Open GitHub Actions → workflow `release-production`.
2. Click **Run workflow**.
3. Provide the previous known-good `tag`.
4. Approve the run in the `production` environment (required reviewers).

The workflow will pull the already-built images for that tag, apply migrations (idempotent), deploy API then web, and validate via `/health` and `/api/health`.

## Forward-only migrations

If a migration cannot be safely downgraded, follow the forward-fix plan process:

- Create a sibling `<revision_id>.forward-fix.md` using the template at `apps/api/app/db/migrations/forward-fix-template.md`.
- Apply the forward-fix migration in staging first, validate, then promote to production.

