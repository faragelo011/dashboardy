This package is the Dashboardy FastAPI service: HTTP API, configuration, database access, and migrations. Run it with `uv run uvicorn app.main:app` from this directory after `uv sync` and setting `DATABASE_URL`.

## Auth + Tenancy (Feature 2) environment variables

Feature 2 introduces JWT verification for Supabase Auth. The API expects the following variables (names only; set values in your shell or deployment platform):

**Planned for Phase 2 wiring** (not yet loaded by the current API code):

- `SUPABASE_JWKS_URL` (planned required)
- `SUPABASE_JWT_ISSUER` (planned required)
- `SUPABASE_JWT_AUDIENCE` (planned optional)

When implemented, these will be added to `app.config.Settings` (as
`Settings.SUPABASE_JWKS_URL`, `Settings.SUPABASE_JWT_ISSUER`,
`Settings.SUPABASE_JWT_AUDIENCE`) and used by an auth initializer such as
`app.main.init_auth()` (or middleware like `verify_jwt_middleware`) to enforce
token validation on protected endpoints.

Feature 1 variables still apply:

- `DATABASE_URL` (required)
- `ENVIRONMENT` (required in deployed environments)
- `LOG_LEVEL` (optional)
