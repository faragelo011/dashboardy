# Deploy to staging (tagged release)

This runbook describes how to deploy `dashboardy-api` and `dashboardy-web` to **staging** via a Git release tag.

## Prerequisites

- You have permission to push tags to the repository.
- The GitHub Actions workflow `release-staging` exists at `.github/workflows/release-staging.yml`.
- Staging environment secrets are configured in GitHub Environments (`staging`), at minimum:
  - Container registry credentials (`REGISTRY`, `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`)
  - Staging URLs used by post-deploy checks (`STAGING_API_URL`, `STAGING_WEB_URL`)
  - Bunny deploy secret: `BUNNYNET_API_KEY`
  - Bunny deploy variables: `STAGING_API_APP_ID`, `STAGING_WEB_APP_ID`
  - Optional Bunny container-name variables if the container is not named `app`: `STAGING_API_CONTAINER`, `STAGING_WEB_CONTAINER`

## Tag format

Recommended: `vYYYY.MM.DD-N` (where `N` starts at `1` each day).

Example: `v2026.04.26-1`

## Deploy steps

1. Ensure `main` is green (CI passing).
2. Create and push a tag:

```bash
git checkout main
git pull
git tag v2026.04.26-1
git push origin v2026.04.26-1
```

3. In GitHub Actions, open the `release-staging` workflow run for the tag.
4. Watch the workflow complete in this order:
   - Build & push API image
   - Build & push Web image
   - Deploy API to Bunny staging
   - Wait for API `/health`
   - Deploy Web to Bunny staging
   - Wait for Web `/api/health`

## Troubleshooting

- **Build fails**: inspect the failing build step logs, fix on `main`, then push a new tag.
- **Deploy fails**: check the Bunny deploy step logs and verify `BUNNYNET_API_KEY`, the staging app IDs, and the target container names.
- **Health check retries fail**:
  - Confirm the staging URL secrets are correct (`STAGING_API_URL`, `STAGING_WEB_URL`).
  - Check the API container logs; ensure `GET /health` returns 200.
  - Check the web container logs; ensure `GET /api/health` returns 200.

## Staging URLs

- API base URL: `${STAGING_API_URL}`
- Web base URL: `${STAGING_WEB_URL}`

