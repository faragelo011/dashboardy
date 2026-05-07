# @dashboardy/config

Shared configuration conventions for Dashboardy packages.

This package intentionally contains **documentation and naming conventions** only in Phase 2 (Auth + Tenancy). Implementation-specific helpers can be added later if needed.

## Canonical auth environment variables

These names are used by the API and web apps during Feature 2 (Auth + Tenancy).

### API (FastAPI) - Supabase JWT verification

- `SUPABASE_JWKS_URL` (**required**): JWKS endpoint used to validate Supabase JWT signatures.
- `SUPABASE_JWT_ISSUER` (**required**): expected `iss` claim.
- `SUPABASE_JWT_AUDIENCE` (**optional**): expected `aud` claim (set if your Supabase project uses a fixed audience).

Notes:

- The API still requires `DATABASE_URL` from Feature 1 for tenant metadata storage.
- Do not log any of the above values at runtime.

### Web (Next.js) - Supabase session auth

- `NEXT_PUBLIC_SUPABASE_URL` (**required**): Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (**required**): Supabase anon/public key.

Notes:

- Web code MUST only expose variables prefixed with `NEXT_PUBLIC_` to the browser.
- App data authorization remains backend-owned; Supabase is used for sign-in/session only.

### Reserved (future admin flows)

Some Supabase admin operations may require a service role key in later tasks. If introduced, it must remain **server-only** (never `NEXT_PUBLIC_`) and must not be logged.

## Data connections (Feature 3) environment variables (names only)

Feature 3 stores Snowflake credential material in **Supabase Vault** and stores only non-secret connection metadata in Postgres. The browser must never receive Snowflake credentials or any Vault secret identifiers.

### API (FastAPI) - Supabase Vault access (server-only)

- `SUPABASE_URL` (**required**): Supabase project base URL used by the API for Vault operations.
- `SUPABASE_SERVICE_ROLE_KEY` (**required**): service role key used by the API to call Vault endpoints.

Notes:

- Keep `SUPABASE_SERVICE_ROLE_KEY` out of the web app environment.
- Do not log Vault request bodies, Vault secret IDs, or any secret material.

### API (FastAPI) - Snowflake connector tuning (optional, server-only)

Snowflake credentials are tenant-provided (submitted via API) and **must not** come from environment variables in Feature 3. These optional variables are reserved for operational tuning:

- `SNOWFLAKE_CONNECT_TIMEOUT_SECONDS` (optional)
- `SNOWFLAKE_LOGIN_TIMEOUT_SECONDS` (optional)
