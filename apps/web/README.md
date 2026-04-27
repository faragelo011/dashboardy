# @dashboardy/web

Dashboardy web app (Next.js 14, App Router).

Feature 2 (Auth + Tenancy) uses Supabase for **sign-in and session restore only**. All authorization and tenant-scoped application data access goes through the API.

## Environment variables (Feature 2)

- `NEXT_PUBLIC_SUPABASE_URL` (required)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required)

Feature 1 variables still apply:

- `API_PUBLIC_URL` (required for server-side API calls from the web container)
- `WEB_PUBLIC_URL` (optional)
