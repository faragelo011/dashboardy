# Implementation Plan: Data Connections + Credentials

**Branch**: `003-data-connections` | **Date**: 2026-04-29 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/003-data-connections/spec.md`

## Summary

Feature 3 adds admin-only management for the tenant's single Snowflake data connection. The implementation stores non-secret connection metadata in Supabase Postgres, stores Snowflake credentials only in Supabase Vault, exposes sanitized status and test results to admins, activates new or rotated credentials only after a successful test, and records a secret-free audit trail for create, metadata update, test, and rotation attempts.

The technical approach follows [docs/implementation-plan.md](../../docs/implementation-plan.md) Feature 3 and constitution v1.2.0: FastAPI owns all connection management and secret access, the web app receives metadata only, one active connection per tenant is enforced, shared connections across tenants are forbidden, and Snowflake remains the source of truth for warehouse data access. The clarification session recorded in [spec.md](spec.md) resolved the open lifecycle, status, and audit questions.

## Technical Context

**Language/Version**: Python 3.12 (API), TypeScript 5.x (web/shared packages)  
**Primary Dependencies**: FastAPI, Pydantic v2, SQLAlchemy 2.x async, asyncpg, Alembic, Supabase Vault service access, `snowflake-connector-python`, structlog/python-json-logger; Next.js 14 App Router, React 18, generated/shared TypeScript contracts in `packages/types`  
**Storage**: Supabase Postgres for `data_connections` metadata and connection management audit records; Supabase Vault for Snowflake credential material; Snowflake as external analytics warehouse only  
**Testing**: pytest + pytest-asyncio + httpx for API unit/integration/contract tests; mocked Supabase Vault and Snowflake connector tests; Playwright for admin connections page smoke flow; TypeScript checks for shared types  
**Target Platform**: Linux containers on Bunny Magic Containers, with staging and production environments inherited from Feature 1  
**Project Type**: Web application monorepo with `apps/api`, `apps/web`, and shared `packages/`  
**Performance Goals**: Admins can complete setup and first test in under 5 minutes; successful rotations become effective for new downstream data access within 60 seconds after the passing test; connection metadata reads should remain normal protected-page latency  
**Constraints**: Admin-only management; one active connection per tenant; no delete or disable in MVP; credentials never returned or logged; credentials activate only after a successful test; failed create/rotation tests preserve the previous active state; audit all management attempts without secrets  
**Scale/Scope**: Feature 3 covers data connection metadata, Vault-backed credential create/rotate, connection testing, status vocabulary, admin UI surface, audit records, and cache-holder invalidation signaling for later query execution; excludes query execution, saved questions, dashboards, multiple tenant connections, non-Snowflake connectors, and connection delete/disable

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.2.0 - [.specify/memory/constitution.md](../../.specify/memory/constitution.md). This feature is explicitly Feature 3 in constitution Section 13 and must follow Feature 2 auth + tenancy.

| # | Non-Negotiable | Feature 3 status |
|---|----------------|------------------|
| 1 | Every resource tenant-bound | **Pass**: connection metadata and audit records are tenant-bound and resolved through Feature 2 context |
| 2 | Sensitive ops through backend | **Pass**: all credential create, rotate, test, and Vault access happen through FastAPI |
| 3 | Snowflake = data SoT | **Pass**: the connection points at Snowflake; no warehouse data is stored by this feature |
| 4 | Raw SQL constrained | N/A: query execution arrives in Feature 4; this feature only validates connectivity |
| 5 | Query execution logged | N/A: no BI query execution in this feature; connection management actions have their own audit records |
| 6 | No BI data in app DB | **Pass**: stores only metadata, secret references, status, sanitized errors, and audit records |
| 7 | No shared connections across tenants | **Pass**: one connection per tenant; no cross-tenant sharing or reuse |
| 8 | Authors vs consumers | **Pass**: admins manage connections; analysts/viewers/external clients cannot manage credentials |
| 9 | Scope creep rejected | **Pass**: no delete/disable, multiple connections, non-Snowflake connectors, query execution, or dashboard work |

Additional constitutional checks:

- Section 4.3 connection strategy: enforce one Snowflake connection per tenant in MVP.
- Section 5.1 roles: only admins may manage Snowflake connection credentials.
- Section 9 architecture: frontend displays metadata and submits admin actions; backend owns security, validation, secret access, and contracts.
- Section 10 secrets: Snowflake credentials are stored only in Supabase Vault and never appear in app tables, frontend responses, logs, traces, or audits.
- Section 11 migrations: schema changes must be committed Alembic revisions and applied identically to staging and production.
- Section 14 build order: connections are implemented after auth + tenancy and before query engine.

**Gate result**: Pass. No constitutional violations to justify in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/003-data-connections/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── data-connections.openapi.yaml
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/
├── api/
│   ├── app/
│   │   ├── connections/            # connection services, Vault adapter, Snowflake test adapter
│   │   ├── models/                 # SQLAlchemy models for connection metadata and audit
│   │   ├── routes/
│   │   │   └── connections.py      # admin-only connection endpoints
│   │   ├── db/
│   │   │   └── migrations/
│   │   │       └── versions/       # Feature 3 Alembic migration(s)
│   │   ├── tenancy/                # reuse permission service and context resolution
│   │   └── main.py                 # include connections router
│   └── tests/
│       ├── contract/               # OpenAPI contract tests for connection endpoints
│       ├── integration/            # DB-backed one-connection, audit, and authz tests
│       └── unit/                   # Vault adapter, secret redaction, status transition tests
├── web/
│   ├── app/
│   │   ├── connections/            # admin connections page and actions
│   │   └── lib/                    # connection API client helpers
│   └── tests/
│       └── data-connections.spec.ts # Playwright admin connections smoke flow

packages/
├── types/
│   └── src/                        # shared connection status/request/response types
└── config/                         # environment variable names for Vault/Snowflake config
```

**Structure Decision**: Web application monorepo, extending Features 1 and 2. Backend domain logic lives in a new `connections` domain so route handlers remain thin and reuse Feature 2 tenancy/admin authorization. The web app owns the admin connection form and status display only; it never receives or stores credential values after submission.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified.

No violations. Section intentionally empty.

---

## Phase 0 - Outline & Research

See [research.md](research.md). All Technical Context entries are resolved; decisions cover metadata and secret storage, credential activation, status transitions, audit records, Snowflake connectivity testing, and rotation propagation.

## Phase 1 - Design & Contracts

- [data-model.md](data-model.md) - Feature 3 entities, fields, relationships, validation rules, state transitions, and migration notes.
- [contracts/data-connections.openapi.yaml](contracts/data-connections.openapi.yaml) - API contract for admin-only connection metadata, create/update, test, rotate, and audit-safe responses.
- [quickstart.md](quickstart.md) - local verification workflow and acceptance-test checklist for data connections + credentials.

## Post-Design Constitution Re-check

After producing Phase 1 artifacts, all design decisions remain within constitution v1.2.0:

- Connection metadata and audits are tenant-bound.
- FastAPI remains the only actor with secret-store access and Snowflake credential handling.
- Supabase Vault is the only credential store; app database keeps opaque references only.
- One connection per tenant is enforced by model and contract.
- No BI warehouse data or plaintext credentials are persisted in app tables or logs.
- Query execution remains deferred to Feature 4; this feature only tests connectivity and prepares connection resolution.

**Gate result**: Pass. No Complexity Tracking entries required.
