# Environment Variables

This is the single reference for Dashboardy's Phase 1 environment contract. Store real values in the deployment platform or local shell only; do not commit secrets.

## API Variables

| Name | Required | Description |
|------|----------|-------------|
| `DATABASE_URL` | Yes | Async PostgreSQL URL used by SQLAlchemy and Alembic, using the `postgresql+asyncpg://` driver form. |
| `ENVIRONMENT` | Deployed environments | Runtime environment name, normally `local`, `staging`, or `production`. |
| `LOG_LEVEL` | No | API log verbosity. Defaults to `info`; typical values are `debug`, `info`, `warning`, and `error`. |

## Web Variables

| Name | Required | Description |
|------|----------|-------------|
| `API_PUBLIC_URL` | Yes | Server-side public base URL used by the web container to call the API. |
| `WEB_PUBLIC_URL` | No | Public canonical URL of the web app for callbacks, links, and operational references. |
| `NEXT_PUBLIC_API_PUBLIC_URL` | No | Browser-exposed mirror of the API base URL. Only variables with the `NEXT_PUBLIC_` prefix are bundled for browser code. |

## Deployment Variables

Configure these as environment-scoped secrets in GitHub Actions and the container platform. Record names only, never values:

- `REGISTRY`, `REGISTRY_USERNAME`, `REGISTRY_PASSWORD` for container registry access.
- `BUNNYNET_API_KEY` for Bunny container image updates.
- `STAGING_DATABASE_URL`, `PRODUCTION_DATABASE_URL` for migration jobs.
- `STAGING_API_URL`, `STAGING_WEB_URL`, `PRODUCTION_API_URL`, `PRODUCTION_WEB_URL` for post-deploy health checks.
- `STAGING_API_APP_ID`, `STAGING_API_CONTAINER`, `STAGING_WEB_APP_ID`, `STAGING_WEB_CONTAINER` for staging Bunny targets.
- `PRODUCTION_API_APP_ID`, `PRODUCTION_API_CONTAINER`, `PRODUCTION_WEB_APP_ID`, `PRODUCTION_WEB_CONTAINER` for production Bunny targets.

## Local Development

Start from [`.env.example`](../.env.example), replace placeholders with local-only values, and keep the resulting `.env` untracked. Missing required variables cause the affected app to exit during startup with `Missing required environment variable: <NAME>`.
