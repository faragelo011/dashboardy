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

## Feature 3 (data connections) troubleshooting

Normalize errors as JSON with `error_code`, `message`, and optional object `details` (never contains submitted secrets).

Typical failures while exercising `GET|PUT …/connection`, `POST …/connection/test`, and `POST …/connection/rotate`:

| Situation                                          | Typical HTTP outcome | Hint                                                                                                                                 |
|----------------------------------------------------|----------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| Supabase Vault down or unreachable                 | 503                  | Confirm `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`; service stores pending/effective credential material exclusively in Vault.      |
| Missing Vault env vars for a credential-bearing op | 503                  | `dependency_unavailable` from the unconfigured Vault adapter on `PUT` with credentials and on `POST …/test` / `rotate`.               |
| Snowflake rejects login or bad MFA configuration   | 200 + `failure` body | Connectivity errors map to `failure_category: credential`; `sanitized_error` is admin-safe (no PEM/password echo).                   |
| Network / firewall / DNS to Snowflake              | 200 + `failure`      | Look for `failure_category: network` after a bounded login/network timeout handled by `snowflake-connector-python`.                 |
| Connected but role/warehouse/session insufficient   | 200 + `failure`      | Typically `failure_category: permission` once login completes but Snowflake rejects warehouse/role/session policy checks.              |
| Long-running login / stalled OCSP handshake        | 200 + `failure`      | `failure_category: timeout` after bounded connector timeouts (`SNOWFLAKE_*_TIMEOUT_SECONDS` optional knobs).                           |
| Tester could not categorize an exception           | 200 + `failure`      | `failure_category: unknown` preserves `sanitized_error` without emitting stack traces externally.                                       |

Operational reminder: plaintext passwords, PEM keys, and Vault identifiers must never surface in REST shapes, Postgres audit rows managed by Feature 3, or structured logs (see regression tests scanning stdout).
