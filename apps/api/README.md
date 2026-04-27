This package is the Dashboardy FastAPI service: HTTP API, configuration, database access, and migrations. Run it with `uv run uvicorn app.main:app` from this directory after `uv sync` and setting `DATABASE_URL`.

## Auth + Tenancy (Feature 2) environment variables

Feature 2 adds Supabase JWT settings to `app.config.Settings`. They are **required** at API process startup (including Alembic, which imports `get_settings()`). Protected routes use `app.auth_context.dependencies.get_current_user_id`, which calls `verify_supabase_jwt()` against your JWKS URL.

- `SUPABASE_JWKS_URL` (required): JWKS endpoint for RS256 verification (e.g. `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`).
- `SUPABASE_JWT_ISSUER` (required): expected JWT `iss` (typically `https://<ref>.supabase.co/auth/v1`).
- `SUPABASE_JWT_AUDIENCE` (optional): when unset, audience is not enforced; when set, tokens must include a matching `aud`.

Feature 1 variables still apply:

- `DATABASE_URL` (required)
- `ENVIRONMENT` (required in deployed environments)
- `LOG_LEVEL` (optional)
