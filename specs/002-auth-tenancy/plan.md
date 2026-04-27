# Implementation Plan: Auth + Tenancy

**Branch**: `002-auth-tenancy` | **Date**: 2026-04-27 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/002-auth-tenancy/spec.md`

## Summary

Feature 2 establishes the identity, tenancy, workspace membership, role, and permission baseline that every downstream tenant-scoped request will rely on. The implementation adds API-owned authentication context, tenant/workspace resolution, authoritative workspace memberships, admin member management, deactivation-based access removal, internal collection grants, external per-asset grants, and a minimal protected web shell that restores session state and calls the backend for `/me`.

The technical approach follows [docs/implementation-plan.md](../../docs/implementation-plan.md) Feature 2 and constitution v1.2.0: Supabase Auth provides identity, FastAPI is the authorization source of truth, Supabase Postgres stores application metadata, all app resources are tenant-bound, and the web app does not use a direct Supabase data client for application tables. There are no `NEEDS CLARIFICATION` items after the clarification session recorded in [spec.md](spec.md).

## Technical Context

**Language/Version**: Python 3.12 (API), TypeScript 5.x (web/shared packages)  
**Primary Dependencies**: FastAPI, Pydantic v2, SQLAlchemy 2.x async, asyncpg, Alembic, httpx, structlog/python-json-logger; Next.js 14 App Router, React 18, `@supabase/ssr` for auth session handling, generated/shared TypeScript contracts in `packages/types`  
**Storage**: Supabase Postgres for tenants, workspaces, memberships, collection grants, asset grants; Supabase Auth for user identities; no BI warehouse data stored in app DB  
**Testing**: pytest + pytest-asyncio + httpx for API unit/integration/contract tests; Playwright for protected-layout smoke flows; TypeScript checks for shared types  
**Target Platform**: Linux containers on Bunny Magic Containers, with staging and production environments inherited from Feature 1  
**Project Type**: Web application monorepo with `apps/api`, `apps/web`, and shared `packages/`  
**Performance Goals**: Signed-in members with valid memberships reach protected workspace context in under 3 seconds; role/grant/membership-status changes apply to at least 95% of next protected actions without sign-out  
**Constraints**: Backend-only application authorization; every protected tenant-scoped action must resolve or deny before returning tenant data; one workspace per tenant in MVP; tenant/workspace/initial-admin records are operator pre-provisioned; inactive memberships deny access while preserving history; external clients receive only explicit asset grants and no SQL/connection metadata  
**Scale/Scope**: Feature 2 covers auth context, tenancy, membership roles, member invite/manage/deactivate flows, `/me`, optional workspace-switch no-op/stub, admin member endpoints, grant metadata, and a protected web layout; excludes data connections, query execution, saved-question CRUD, dashboard CRUD, and anonymous/public sharing

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.2.0 - [.specify/memory/constitution.md](../../.specify/memory/constitution.md). This feature is explicitly Feature 2 in constitution Section 13 and implementation-plan build order.

| # | Non-Negotiable | Feature 2 status |
|---|----------------|------------------|
| 1 | Every resource tenant-bound | **Pass**: all new domain tables carry or derive tenant context; protected actions resolve `tenant_id` before returning data |
| 2 | Sensitive ops through backend | **Pass**: FastAPI owns application reads/writes and authorization; web uses Supabase only for auth session |
| 3 | Snowflake = data SoT | N/A: no Snowflake connections or query execution in this feature |
| 4 | Raw SQL constrained | N/A: SQL authoring/execution starts in later features |
| 5 | Query execution logged | N/A: no query execution in this feature |
| 6 | No BI data in app DB | **Pass**: stores only application metadata for identity, tenancy, grants, and membership |
| 7 | No shared connections across tenants | N/A: connections arrive in Feature 3 |
| 8 | Authors vs consumers | **Pass**: role baseline separates admin, analyst, viewer, and external-client behavior |
| 9 | Scope creep rejected | **Pass**: no onboarding/self-service tenant creation, no query/content CRUD, no public links |

Additional constitutional checks:

- Section 4 tenancy: new access context and tables preserve tenant isolation and no cross-tenant reads/writes.
- Section 5 roles: admin manages members, analyst authors later BI content, viewer consumes granted internal content, external client consumes explicit grants only.
- Section 6 permissions: collection sharing is internal; external clients use explicit per-asset grants only.
- Section 9 architecture: frontend does not own security rules; backend owns authorization, tenant resolution, validation, and API contracts.
- Section 11 migrations: all schema changes must be committed Alembic revisions and applied identically to staging and production.
- Section 14 build order: this is Feature 2 after the platform foundation.

**Gate result**: Pass. No constitutional violations to justify in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-auth-tenancy/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── auth-tenancy.openapi.yaml
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/
├── api/
│   ├── app/
│   │   ├── auth_context/          # JWT verification, user context, protected-route dependency
│   │   ├── tenancy/               # tenant/workspace/member resolution + permission service
│   │   ├── admin/                 # admin member management and external grants routes
│   │   ├── db/
│   │   │   └── migrations/
│   │   │       └── versions/      # Feature 2 Alembic migration(s)
│   │   ├── models/                # SQLAlchemy models for Feature 2 metadata
│   │   ├── routes/
│   │   │   ├── me.py              # GET /me
│   │   │   └── workspaces.py      # POST /workspaces/switch no-op/stub
│   │   └── main.py                # include new routers and auth middleware/dependencies
│   └── tests/
│       ├── contract/              # OpenAPI contract tests for Feature 2 endpoints
│       ├── integration/           # DB-backed tenancy, membership, grant resolution tests
│       └── unit/                  # permission service and JWT/context tests
├── web/
│   ├── app/
│   │   ├── (auth)/                # sign-in/sign-out screens
│   │   ├── (protected)/           # protected layout that calls GET /me
│   │   └── members/               # admin member management MVP surface
│   └── tests/
│       └── auth-tenancy.spec.ts   # Playwright protected-layout/member smoke flows

packages/
├── types/
│   └── src/                       # shared Auth/Tenancy response and role types
└── config/                        # environment variable names used by web/API auth config
```

**Structure Decision**: Web application monorepo, extending the Feature 1 substrate. Backend domain logic is split between `auth_context`, `tenancy`, and `admin` to match [docs/implementation-plan.md](../../docs/implementation-plan.md) Section 2.3. Route handlers remain thin and call the tenancy permission service so authorization rules are not duplicated.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified.

No violations. Section intentionally empty.

---

## Phase 0 - Outline & Research

See [research.md](research.md). All Technical Context entries are resolved; decisions cover JWT verification, membership lifecycle, role permission baseline, grant modeling, and one-workspace MVP behavior.

## Phase 1 - Design & Contracts

- [data-model.md](data-model.md) - Feature 2 entities, fields, relationships, validation rules, state transitions, and migration notes.
- [contracts/auth-tenancy.openapi.yaml](contracts/auth-tenancy.openapi.yaml) - API contract for `/me`, workspace switch stub, admin member management, and external asset grants.
- [quickstart.md](quickstart.md) - local verification workflow and acceptance-test checklist for auth + tenancy.

## Post-Design Constitution Re-check

After producing Phase 1 artifacts, all design decisions remain within constitution v1.2.0:

- New tables are tenant-bound directly or through workspace/member relationships.
- Backend remains the authorization source of truth.
- No BI data, Snowflake credentials, or query results are persisted by this feature.
- External access is explicit per asset and cannot inherit collection access.
- Member deactivation preserves historical references and denies future access.
- Operator pre-provisioning avoids adding unplanned self-service tenant onboarding.

**Gate result**: Pass. No Complexity Tracking entries required.
