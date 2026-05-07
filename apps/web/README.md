# @dashboardy/web

Dashboardy web app (Next.js 14, App Router).

Feature 2 (Auth + Tenancy) uses Supabase for **sign-in and session restore only**. All authorization and tenant-scoped application data access goes through the API.

## Environment variables (Feature 2)

- `NEXT_PUBLIC_SUPABASE_URL` (required)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required)

Feature 1 variables still apply:

- `API_PUBLIC_URL` (required for server-side API calls from the web container)
- `WEB_PUBLIC_URL` (optional)

## Data connections (Feature 3) local configuration

Feature 3 adds an admin-only Connections page at `/connections` that calls the API for:

- connection metadata (no secrets)
- submitting credentials (write-only; never echoed back)
- testing and rotation workflows (later phases)

Required:

- `API_PUBLIC_URL` must point to the API base URL reachable from the Next.js server runtime.

Rules:

- Do not add Snowflake credentials or Supabase service keys to the web app environment.
