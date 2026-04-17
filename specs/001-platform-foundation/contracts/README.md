# Contracts: Platform Foundation

**Feature**: 001-platform-foundation

Phase 1 exposes only operational endpoints — no domain endpoints exist yet. The contracts here are the substrate that on-call operators and the deploy pipeline rely on.

| Contract | File | Owner | Purpose |
|----------|------|-------|---------|
| API health (liveness) and readiness | [api-health.openapi.yaml](api-health.openapi.yaml) | `apps/api` | FR-006, US3, SC-004 |
| Web liveness | [web-health.openapi.yaml](web-health.openapi.yaml) | `apps/web` | FR-007, US3 |
| Correlation-ID HTTP header | documented inline in [api-health.openapi.yaml](api-health.openapi.yaml) | `apps/api` | FR-008, US3 acceptance scenario 3 |

No other endpoints are introduced in this phase. Domain endpoints begin arriving in Feature 2 (`/me`, `/workspaces/...`, etc.).
