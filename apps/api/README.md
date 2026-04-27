This package is the Dashboardy FastAPI service: HTTP API, configuration, database access, and migrations. Run it with `uv run uvicorn app.main:app` from this directory after `uv sync` and setting `DATABASE_URL`.

## Auth + Tenancy (Feature 2) environment variables

Feature 2 introduces JWT verification for Supabase Auth. The API expects the following variables (names only; set values in your shell or deployment platform):

- `SUPABASE_JWKS_URL` (required)
- `SUPABASE_JWT_ISSUER` (required)
- `SUPABASE_JWT_AUDIENCE` (optional)

Feature 1 variables still apply:

- `DATABASE_URL` (required)
- `ENVIRONMENT` (required in deployed environments)
- `LOG_LEVEL` (optional)
