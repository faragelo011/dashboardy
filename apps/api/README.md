This package is the Dashboardy FastAPI service: HTTP API, configuration, database access, and migrations. Run it with `uv run uvicorn app.main:app` from this directory after `uv sync` and setting `DATABASE_URL`.

## Auth + Tenancy (Feature 2) environment variables

Feature 2 adds Supabase JWT settings to `app.config.Settings`. JWT verification config is **required** at API process startup (including Alembic, which imports `get_settings()`). Protected routes use `app.auth_context.dependencies.get_current_user_id`, which calls `verify_supabase_jwt()` against either a JWKS URL or the Supabase JWT secret.

- `SUPABASE_JWKS_URL` (required for RS256/ES256 verification unless `SUPABASE_JWT_SECRET` is set): JWKS endpoint (e.g. `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`).
- `SUPABASE_JWT_SECRET` (required for HS256 verification unless `SUPABASE_JWKS_URL` is set): Supabase Project Settings → API → JWT Secret.
- `SUPABASE_JWT_ISSUER` (required): expected JWT `iss` (typically `https://<ref>.supabase.co/auth/v1`).
- `SUPABASE_JWT_AUDIENCE` (optional): when unset, audience is not enforced; when set, tokens must include a matching `aud`.

Feature 1 variables still apply:

- `DATABASE_URL` (required)
- `ENVIRONMENT` (required in deployed environments)
- `LOG_LEVEL` (optional)

## Auth + Tenancy (Feature 2) error codes

Feature 2 endpoints return normalized JSON error payloads of the form:

```json
{ "error_code": "<string>", "message": "<human-readable>" }
```

Common `error_code` values:

- `auth_required`: missing/invalid JWT (401)
- `no_membership`: authenticated user has no workspace membership (403)
- `inactive_membership`: membership exists but is inactive (403)
- `authz_denied`: authenticated, active member lacks permission for the action (403)

Admin / dependency-facing codes:

- `dependency_unavailable`: upstream dependency misconfigured/unavailable (503)
- `rate_limited`: upstream rate limiting (429)
- `invite_rejected`: invite payload rejected by upstream (400)
- `membership_conflict`: membership exists but is inactive / cannot be re-invited (409)
