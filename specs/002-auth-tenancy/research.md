# Phase 0 Research: Auth + Tenancy

**Feature**: 002-auth-tenancy  
**Date**: 2026-04-27  
**Status**: All Technical Context entries resolved. Zero `NEEDS CLARIFICATION` markers remain.

This document records the decisions for Feature 2 planning. The locked stack comes from [docs/implementation-plan.md](../../docs/implementation-plan.md) and the constitutional constraints come from [.specify/memory/constitution.md](../../.specify/memory/constitution.md).

---

## R-001 Authentication provider and session boundary

- **Decision**: Supabase Auth remains the identity provider. The web app uses Supabase only for sign-in, sign-out, and session restore; all application data and authorization decisions go through FastAPI.
- **Rationale**: This satisfies constitution non-negotiable 2 and Section 9: the frontend may manage user interface and session state, but the backend owns tenant resolution and authorization. It also matches the implementation plan's backend-only client model.
- **Alternatives considered**:
  - **Direct web access to Supabase application tables** - rejected because it would split authorization between frontend/RLS and FastAPI.
  - **Custom password store** - rejected because Supabase Auth is already the project identity system.

## R-002 JWT verification shape

- **Decision**: FastAPI verifies every protected request's Supabase JWT and derives an authenticated `user_id` before resolving tenant/workspace/membership context.
- **Rationale**: A single backend dependency chain gives route handlers one reliable authorization context and supports deterministic 401 vs 403 behavior. Missing or invalid JWTs are authentication failures; valid users without membership are authorization failures.
- **Alternatives considered**:
  - **Trust user IDs sent by the web client** - rejected as insecure.
  - **Verify JWT separately in each route** - rejected because it invites drift and inconsistent error behavior.

## R-003 Tenant and workspace bootstrap

- **Decision**: Tenant, workspace, and first admin membership records are operator pre-provisioned for MVP.
- **Rationale**: The feature is about access resolution and workspace member management, not self-service tenant onboarding. Pre-provisioning avoids introducing product scope not listed in the implementation plan.
- **Alternatives considered**:
  - **First signed-in admin creates tenant/workspace** - rejected as a new onboarding feature.
  - **Platform-owner invite creates tenant/workspace automatically** - viable later, but rejected for MVP scope discipline.

## R-004 Membership lifecycle

- **Decision**: Memberships have active and inactive states. Admins deactivate memberships to remove future access; historical membership references remain.
- **Rationale**: Deactivation supports auditability and avoids breaking foreign-key references from grants or later authored content. Authorization denies inactive memberships on the next protected action.
- **Alternatives considered**:
  - **Hard delete memberships** - rejected because it loses history and complicates future audit references.
  - **Only role changes, no removal** - rejected because admins need an access-removal path.

## R-005 Role permission baseline

- **Decision**: Admin manages members, roles, membership status, and external grants. Analyst is an internal author for later content features. Viewer reads granted internal content only. External client reads explicit asset grants only.
- **Rationale**: This mirrors constitution Section 5 and the implementation plan's authors-vs-consumers split. It gives Feature 2 enough permission semantics for route guards and downstream feature tests without implementing later content CRUD.
- **Alternatives considered**:
  - **Allow analysts to manage members** - rejected because constitution gives member management to admins.
  - **Collapse viewer and external client permissions** - rejected because external clients must never inherit internal collection access.

## R-006 Grant modeling

- **Decision**: Internal collection sharing uses membership-scoped collection grants. External access uses explicit asset grants keyed by workspace, external user, asset type, asset ID, and `can_export`.
- **Rationale**: Membership-scoped internal grants keep internal permissions tied to workspace membership and role. Per-asset external grants enforce constitution Section 6: external clients never receive access by inheritance.
- **Alternatives considered**:
  - **Use user IDs for all internal grants** - rejected because it weakens the tie to workspace membership and deactivation.
  - **Let external clients use collection grants** - rejected by the spec and constitution because external access must be explicit per asset.

## R-007 One-workspace MVP behavior

- **Decision**: Preserve tenant/workspace concepts in schema and responses, but enforce one workspace per tenant for the MVP. The UI shows the workspace name and hides or disables switching.
- **Rationale**: This matches the master plan and keeps future multi-workspace support possible without building switching complexity now.
- **Alternatives considered**:
  - **No workspace concept in MVP** - rejected because downstream resources are workspace-scoped.
  - **Full multi-workspace switching now** - rejected as premature scope.

## R-008 Permission service ownership

- **Decision**: The `tenancy` domain owns the central permission service, returning an allow/deny decision and reason code for protected actions.
- **Rationale**: The implementation plan explicitly forbids duplicating permission logic across route handlers. A central service keeps 401/403 behavior, role checks, membership-status checks, and grant checks consistent.
- **Alternatives considered**:
  - **Route-local permission checks** - rejected due to drift risk.
  - **Frontend route guards as enforcement** - rejected because frontend checks are only UX hints, not security controls.

## R-009 API contract style

- **Decision**: Document Feature 2 externally visible API behavior in one OpenAPI 3.1 contract: `/me`, `/workspaces/switch`, admin member endpoints, and external asset grant endpoints.
- **Rationale**: Feature 1 already uses OpenAPI for API contracts. Keeping the same format supports contract tests and shared TypeScript type generation later.
- **Alternatives considered**:
  - **Markdown-only endpoint descriptions** - rejected because they are harder to validate.
  - **Separate OpenAPI files per route group** - possible later, but unnecessary for this feature's small endpoint set.

## R-010 What is deferred

The following are intentionally out of Feature 2:

- Self-service tenant or workspace onboarding.
- Data connection management and Vault secret access.
- Query execution, query audit logs, result caching, and Snowflake access.
- Saved-question CRUD, dashboard CRUD, and content authoring UI.
- Anonymous public links.
- Full multi-workspace switching.

---

**Outcome**: All Technical Context fields are concrete with no unresolved clarifications. Feature 2 can proceed to design artifacts.
