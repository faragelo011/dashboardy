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
