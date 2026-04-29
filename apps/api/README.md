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

## Data connections (Feature 3) environment variables (names only)

Feature 3 adds admin-only Snowflake connection management. **Credential material is stored only in Supabase Vault** and must never appear in:

- API responses
- Web payloads
- logs / traces
- audit records
- application database tables (except opaque, non-secret references)

### Supabase Vault (server-only)

- `SUPABASE_URL` (required): Supabase project base URL for Vault calls.
- `SUPABASE_SERVICE_ROLE_KEY` (required): service role key used by the API to call Vault endpoints.

### Snowflake connector tuning (optional, server-only)

Tenant credentials are submitted by admins and stored in Vault; they are **not** set via env vars. The API may optionally support:

- `SNOWFLAKE_CONNECT_TIMEOUT_SECONDS` (optional)
- `SNOWFLAKE_LOGIN_TIMEOUT_SECONDS` (optional)

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
