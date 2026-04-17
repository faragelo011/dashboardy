<!--
Sync Impact Report
- Version change: 1.1.0 -> 1.2.0
- Modified principles / sections:
  - 3. Product Model (3.3): pinned per-widget-type TTL defaults for the result cache
  - 5. Roles and Access (5.2, 5.3): analysts MAY clone dashboards/questions within their permitted scope; viewers MUST NOT clone
  - 7. Querying Rules (7.4): defined table-widget pagination as server-capped, client-paginated; no stateful cursors
  - 7. Querying Rules (new 7.7): defined Filter Model — dashboard-global filters with per-widget overrides
  - 16. Open Decisions: all previously open items resolved
- Added sections: 7.7 (Filter Model)
- Removed sections: None
- Templates requiring updates:
  - .specify/templates/plan-template.md - compatible
  - .specify/templates/spec-template.md - compatible
  - .specify/templates/tasks-template.md - compatible
  - .specify/templates/checklist-template.md - compatible
  - .specify/templates/agent-file-template.md - compatible
- Follow-up TODOs: None
-->

# Dashboardy Constitution

**Project**: Dashboardy App
**Domain**: `dashboardy.app`
**Stack**: NextJS 14.x + FastAPI + Supabase (Auth, DB, Vault, Storage) + Snowflake
**Hosting**: Bunny Magic Containers

---

## 1. Purpose

Dashboardy is an internal multi-tenant BI dashboard platform for expert-authored analytics and broad business consumption.

The product is designed so that:

- the BI team authors and validates SQL queries,
- dashboards and saved questions are built from those expert-authored queries,
- business users such as CEOs, GMs, and stakeholders consume dashboards and saved outputs without needing to be SQL experts.

Dashboardy is **not** a general-purpose self-serve BI platform in MVP.
It is an **expert-authored, business-consumed** analytics platform.

---

## 2. MVP Product Scope

MVP includes only:

- dashboard builder
- chart widgets
- SQL editor
- saved questions
- filters
- sharing (as defined in 2.1)
- Snowflake data connectors
- manual CSV export of saved questions and dashboard widgets, capped at the hard row limit defined in 7.4

MVP excludes:

- visual query builder
- AI insights
- scheduled reports
- alerts
- billing
- white-labeling
- semantic layer
- embedded analytics
- comments
- version history
- public sharing links
- non-Snowflake connectors
- XLSX export
- scheduled or asynchronous export jobs

### 2.1 Sharing Semantics (MVP)

"Sharing" in MVP is limited to:

- assigning dashboards, saved questions, and folders to members of the same workspace (internal sharing), and
- explicitly granting external client users scoped access to specific dashboards or saved questions (external sharing).

Sharing MUST NOT:

- produce anonymous public links,
- bypass workspace membership checks,
- expose raw SQL or connection metadata to viewers or external clients.

---

## 3. Product Model

### 3.1 Authoring Model

- SQL authoring is done by expert users only.
- Business users are dashboard consumers first.
- The system MUST support non-technical consumption, not non-technical query authoring.

### 3.2 Data Model Boundary

Dashboardy stores application metadata in Supabase.
Dashboardy does **not** store BI warehouse data in its application database as durable analytical storage.

Short-TTL query result caching (see 3.3) is permitted and is not considered BI data persistence.

#### Supabase stores

- users
- tenants
- workspaces
- memberships
- saved questions metadata
- dashboard definitions
- widget configurations
- folders / collections
- connection metadata
- audit / query execution metadata (schema defined in 7.6)
- bounded, tenant-scoped query result cache entries (see 3.3)
- app configuration

#### Snowflake stores

- analytical source data queried by Dashboardy

### 3.3 Query Result Caching

To meet the concurrency baseline in 8.2 without saturating Snowflake, MVP permits a short-TTL query result cache.

Rules:

- Cache entries MUST be keyed by tenant, connection, saved-question or SQL hash, and bound filter parameters.
- Cache entries MUST carry a TTL. The ceiling is 15 minutes for any entry.
- Cache reads MUST re-check caller permissions at read time; a cache hit MUST NOT bypass authorization.
- Cache entries MUST be isolated per tenant; no cross-tenant reads under any circumstance.
- Cache invalidation MUST occur when the underlying saved question SQL or connection changes.
- Users MUST have a way to force a fresh execution (bypass cache) from the UI.

**Default TTL by widget type (MVP):**

- scalar / KPI / single-value widgets: **10 minutes**
- chart widgets (bar, line, pie, area, scatter, etc.): **5 minutes**
- table widgets: **2 minutes**
- ad hoc SQL executions (not tied to a saved question): **no caching**

Workspaces MAY lower (never raise) these defaults per widget. Raising above the 15-minute ceiling is not permitted in MVP.

The cache is an optimization, not a system of record. Analytical source-of-truth remains Snowflake.

---

## 4. Tenancy Rules

### 4.1 App Tenancy

- Dashboardy is multi-tenant.
- Users MAY belong to multiple tenants / workspaces.
- Every application resource MUST be tenant-scoped.
- Every application resource MUST be workspace-scoped where applicable.

### 4.2 Tenant Isolation

- Tenant isolation is mandatory in the application database.
- No cross-tenant reads are allowed.
- No cross-tenant writes are allowed.

### 4.3 Recommended Snowflake Connection Strategy

For MVP, the default model is:

- **one Snowflake connection per tenant**

This is the recommended baseline because it reduces ambiguity, simplifies credential ownership, and makes operational control cleaner.

Multiple connections per tenant MAY be added later only if there is a proven business need.

Shared Snowflake connections across tenants are not allowed in MVP.

Dev / staging / prod warehouse separation within a single tenant MUST be handled via Snowflake-side objects (warehouses, databases, roles), not by adding multiple app-level connections. One tenant = one connection in MVP.

---

## 5. Roles and Access

MVP roles:

- admin
- analyst
- viewer
- external client

Roles are scoped per workspace. A user MAY hold different roles in different workspaces within the same tenant.

### 5.1 Admin

Can:

- everything an analyst can do, plus:
- create, edit, and delete data connections
- manage workspace membership and role assignments
- manage folder / collection structure at workspace scope
- grant external client access to specific dashboards or saved questions

Admin is the only role that MAY manage Snowflake connection credentials.

### 5.2 Analyst

Can:

- create and edit saved questions
- write and run SQL against connections they have been granted
- create and edit dashboards
- create and edit folders / collections within their permitted scope
- configure widgets
- export results to CSV within the limits defined in 2 and 7.4
- clone (duplicate) dashboards and saved questions into any folder within their permitted scope; clones MUST start with the cloning analyst as the sole owner and inherit the target folder's permissions, not the source's

Cannot:

- create, edit, or delete data connections
- manage workspace membership

### 5.3 Viewer

Can:

- view dashboards and questions they have access to
- use dashboard filters
- access shared internal content within assigned permissions
- export visible results to CSV within the limits defined in 2 and 7.4

Cannot:

- write SQL
- edit saved questions
- edit dashboards
- clone or duplicate dashboards or saved questions into any scope, private or shared
- manage connections
- manage workspace membership

### 5.4 External Client

Can:

- view only explicitly shared content within permitted scope

Cannot:

- write SQL
- edit assets
- manage data connections
- access internal-only workspace content unless explicitly granted
- export results, unless export is explicitly enabled on the shared asset by an admin

---

## 6. Permission Model

MVP permissions are enforced at:

- workspace level
- folder / collection level
- dashboard level
- saved question level

### 6.0 Inheritance

- A saved question inherits the permissions of the folder it lives in, unless explicit per-question overrides are set.
- A dashboard inherits the permissions of the folder it lives in, unless explicit per-dashboard overrides are set.
- Explicit grants always widen, never narrow, inherited access. Restrictions MUST be expressed by removing membership, not by layering denies.
- External client access MUST be expressed only as explicit per-asset grants, never via inheritance.

### 6.1 Critical Security Rule

Dashboardy application permissions are **not** the source of truth for warehouse data security.

Actual data access MUST be enforced at the Snowflake layer.

This means:

- Snowflake roles, grants, schemas, databases, warehouses, and policies MUST control what data can be queried.
- Dashboardy MUST never pretend app-level permissions alone provide data security.
- If Snowflake access is overly broad, Dashboardy is insecure regardless of app UI permissions.

---

## 7. Querying Rules

### 7.1 Query Mode

MVP supports **raw SQL only**.

There is no visual query builder in MVP.

### 7.2 Query Ownership

- Saved questions are authored by expert users.
- Dashboard widgets MUST be powered by saved questions or approved query executions.
- Ad hoc SQL execution is limited to authorized users only.

### 7.3 Query Safety Controls

Every query execution MUST enforce:

- tenant context
- workspace context where relevant
- execution timeout
- row limit
- execution logging (schema defined in 7.6)
- error normalization
- warehouse credential isolation
- SELECT-only access at the Snowflake layer (see 7.5)
- bound parameters for all dashboard/saved-question filter values (see 7.5)

### 7.4 Query Limits

Recommended MVP defaults:

- **Query timeout**: 30 seconds
- **Default row limit**: 5,000 rows
- **Hard maximum row limit**: 10,000 rows
- **Dashboard chart dataset target**: 500 rows or fewer for most visual widgets
- **Large table mode**: allowed only for table widgets, still capped at hard row limit

**Table widget pagination (MVP):**

- The server MUST return up to the hard row limit in a single response (no server-side cursor or "next page" fetch).
- The table widget MUST paginate client-side over the returned result set.
- If the underlying query would exceed the hard row limit, execution MUST return `status = row_limit_exceeded` (see 7.6) and the UI MUST surface a clear message prompting the analyst to narrow the query.
- Stateful server-side pagination, streaming cursors, and "load more" fetches are out of MVP scope.

### 7.5 Restricted Behavior and Enforcement

Restricted behavior is enforced with defense in depth. Both of the following MUST be true:

1. **Snowflake side (primary defense).** Every Dashboardy connection MUST authenticate as a Snowflake role that has only `SELECT` grants on permitted objects. The role MUST NOT hold `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `TRUNCATE`, `DROP`, `CREATE`, `ALTER`, `GRANT`, or account-admin privileges. Warehouse and role switching MUST be disabled for this principal wherever possible.
2. **Backend side (secondary defense).** The FastAPI backend MUST parse every submitted SQL statement with a real SQL parser before dispatch and reject:
   - multi-statement execution
   - any non-`SELECT` / non-`WITH` top-level statement
   - `USE WAREHOUSE`, `USE DATABASE`, `USE SCHEMA`, `USE ROLE`, `SET`, or any session-mutation statement
   - connection-switching or credential-referencing statements
   - unbounded result retrieval beyond the limits in 7.4

**Parameter binding (mandatory).**
Dashboard filters, saved question parameters, and any user-supplied value that feeds into SQL MUST be passed as bound parameters to Snowflake. String concatenation or templated substitution of user values into SQL is forbidden, including:

- `f"... WHERE x = '{value}'"` patterns
- client-side SQL assembly before POSTing to the backend
- filter values injected via Jinja/template rendering without a parameter-binding adapter

If a legitimate use case requires dynamic identifiers (e.g., column names), the backend MUST validate them against an allowlist derived from the saved question definition, not from arbitrary user input.

### 7.6 Audit Log Schema

Every query execution, whether cached or live, MUST produce an audit record. The minimum schema is:

- `id` (uuid)
- `tenant_id`
- `workspace_id`
- `user_id`
- `connection_id`
- `saved_question_id` (nullable, for ad hoc executions)
- `dashboard_id` (nullable, for widget-driven executions)
- `sql_hash` (stable hash of the normalized SQL, not the raw SQL)
- `bound_parameters_hash` (hash only; raw parameter values MUST NOT be logged if they may contain PII)
- `row_count`
- `bytes_scanned` (where Snowflake exposes it)
- `duration_ms`
- `cache_hit` (boolean)
- `status` (`ok` | `timeout` | `row_limit_exceeded` | `rejected_by_parser` | `warehouse_error` | `authz_denied`)
- `error_code` (normalized, nullable)
- `created_at`

Audit records MUST be retained for at least 90 days in MVP. Raw SQL MAY be stored separately, scoped to admin access only, for troubleshooting.

### 7.7 Filter Model

Dashboards support two filter levels:

1. **Dashboard-global filters** — the primary mechanism. A global filter is declared once on the dashboard and MAY be wired into any widget whose underlying saved question exposes a compatible parameter.
2. **Per-widget filter overrides** — a widget MAY override a global filter value, or declare additional widget-local filters, when its analytical context diverges from the rest of the dashboard.

Rules:

- Every filter MUST map to a **bound parameter** on the underlying saved question. Filters that cannot be expressed as bound parameters are forbidden (see 7.5).
- A widget that does not declare a mapping for a given global filter MUST ignore that filter. Silent cross-binding to unrelated columns is forbidden.
- Per-widget overrides MUST be visible in the widget UI; hidden overrides are forbidden.
- Filter default values MUST be stored in the dashboard definition, not derived from the viewing user's identity, tenant, or role.
- Changing a filter MUST invalidate the affected widget's cache key; it MUST NOT serve cached results from a different filter state.

---

## 8. Performance Standards

### 8.1 Recommended Performance Targets

- Dashboard shell first render: under 2 seconds on normal internal network conditions
- Single widget render after data arrives: under 1 second
- Standard dashboard load (up to 6 widgets): under 5 seconds when queries are within normal limits
- Saved question execution target: under 10 seconds for normal use cases
- Hard query timeout: 30 seconds

### 8.2 Concurrency Baseline

Design MVP to tolerate:

- 25 concurrent active users safely
- 10 concurrent query executions safely

If expected usage is higher, this MUST be revised before implementation starts.

When concurrency limits are reached, the backend MUST apply backpressure:

- additional query executions MUST be queued with a bounded wait,
- queued executions MUST return a deterministic "queued" state to the client rather than a 5xx error,
- if the queue itself is full, the backend MUST reject new executions with a clear, typed error (`warehouse_busy`) that the UI can render gracefully.

Dropping requests silently or returning generic 500s under load is not acceptable.

### 8.3 Cost and Warehouse Protection

Because Snowflake cost is query-driven:

- Dashboard queries SHOULD favor pre-aggregated or disciplined SQL patterns
- BI-authored queries are preferred over unrestricted ad hoc usage
- Query logging is mandatory for cost and performance visibility

---

## 9. Architecture Principles

### 9.1 Frontend

NextJS 14.x is responsible for:

- user interface
- navigation
- rendering dashboards
- filter interactions
- asset authoring UI
- client-side state orchestration

Frontend MUST NOT own core business rules or security logic.

### 9.2 Backend

FastAPI is responsible for:

- authorization enforcement
- tenant resolution
- connection resolution
- query execution
- saved question lifecycle
- dashboard lifecycle
- folder lifecycle
- validation
- audit logging
- API contracts

### 9.3 Supabase

Supabase is responsible for:

- authentication
- application database
- storage where needed
- secrets storage via **Supabase Vault**, which is the authoritative store for all Snowflake connection credentials and API tokens (see Section 10)

Supabase is not the analytics warehouse.

### 9.4 Snowflake

Snowflake is the only BI data source in MVP.

Snowflake is responsible for:

- source analytical data
- actual data access enforcement
- warehouse-side performance characteristics

---

## 10. Secrets and Credential Rules

Dashboardy MUST store and handle secrets securely.

### 10.1 Secrets in Scope

MVP secrets include:

- Snowflake credentials
- API tokens

### 10.2 Rules

- Snowflake connection credentials MUST be stored in Supabase Vault. No other secret store is permitted for these credentials in MVP.
- Secrets MUST never be stored in plaintext in regular application tables.
- Secrets MUST never be exposed to the frontend. No API response, log line, or error payload may contain a secret value.
- Secrets MUST never be logged, including in debug traces, audit records (see 7.6), or exception stack traces.
- Secrets MUST be readable only by the FastAPI backend, authenticated as a service role with narrow Vault read grants.
- Secret rotation MUST be possible without code changes or redeploys — only a Vault update and a connection-cache invalidation.
- On secret rotation, in-flight queries MAY complete with the old credential, but all new executions MUST use the rotated value within 60 seconds.

---

## 11. Deployment Rules

Deployment model:

- one application
- separate frontend container
- separate backend container

### 11.1 Environment Structure

Minimum environments:

- staging
- production

### 11.2 Required Baseline

- environment-based configuration
- health endpoints
- structured logging
- deploy reproducibility
- rollback path
- secrets provided through environment or secure secret path only

### 11.3 Database Migrations

- All Supabase schema changes MUST go through versioned, committed migration files.
- Migrations MUST be applied identically to staging and production.
- Ad hoc schema edits via the Supabase UI in production are forbidden outside of incident response, and any such change MUST be back-ported to a migration within the same working day.
- Each migration MUST be independently reversible, OR accompanied by a documented forward-fix plan if a reverse migration is not safe.

---

## 12. Repository Structure

Default monorepo structure:

```text
apps/
  web/
  api/

packages/
  ui/
  types/
  config/
```

### 12.1 Ownership Guidelines

- shared types MUST live in a shared package
- UI primitives MUST live in a shared package if reused
- backend domain logic MUST remain in API, not the frontend

---

## 13. Spec Rules

All feature work MUST be split into independent Spec Kit feature specs.

Initial feature sequence:

1. foundation / platform setup
2. auth + tenancy
3. data connections + credentials
4. query engine
5. saved questions
6. dashboard builder

### 13.1 Spec Quality Rule

No feature spec may:

- violate tenant isolation
- bypass backend authorization
- weaken Snowflake-enforced data access assumptions
- add unsupported MVP scope silently
- introduce direct BI data persistence into the app database

---

## 14. Delivery Principles

### 14.1 Build Order Discipline

The authoritative build order is defined in Section 13 (Spec Rules). Summarized:

Foundation first.
Auth and tenancy second.
Connections before query engine.
Query engine before dashboards.

No skipping the order. Any deviation MUST be justified and recorded per Section 17's Compliance Review.

### 14.2 Tooling Division (Capability-Based)

AI assistants and automation tools MAY be used, but MUST be scoped to a single concern per session:

- **Backend concern**: API contracts, authorization logic, query execution, validation, data modeling, migrations.
- **Scaffolding concern**: repetitive implementation, boilerplate, unit tests, utilities, type definitions.
- **Frontend concern**: UI components, dashboard rendering, filter interactions, client-side orchestration.

Rules:

- No assistant may mix concerns within a single change set without explicit approval.
- No assistant may introduce new architectural decisions — only implement decisions already in the constitution or an approved spec.
- Assistant-generated changes MUST be reviewable as human-authored code: no unexplained dependencies, no speculative abstractions, no silent scope additions.

Specific vendor or product names are intentionally omitted; the rules apply to any tool used.

### 14.3 Anti-Chaos Rule

No tool — human or automated — may generate architecture independently from the constitution and approved spec.

---

## 15. Non-Negotiables

These are mandatory:

1. Every resource MUST be tenant-bound.
2. Every sensitive operation MUST go through the backend.
3. Snowflake is the source of truth for data access control.
4. Raw SQL execution MUST be constrained.
5. Query execution MUST be logged.
6. BI data MUST NOT be copied into the application DB as part of MVP.
7. Shared connections across tenants are forbidden in MVP.
8. Business users are consumers first; expert users are authors first.
9. Scope creep MUST be rejected unless approved through an explicit spec update.

---

## 16. Resolved Decisions (Historical)

This section is retained as a decision log. All MVP-blocking questions are now locked in the constitution itself.

**Resolved in 1.1.0:**

- whether analysts can create data connections directly or only admins can → **admin-only** (Section 5.1)
- whether query result caching is included in MVP or explicitly excluded → **included, bounded, tenant-scoped** (Section 3.3)
- exact external client restrictions → **defined** in Sections 2.1, 5.4, and 6.0

**Resolved in 1.2.0:**

- whether viewers can clone dashboards into private workspace areas → **no; analysts and admins only** (Sections 5.2, 5.3)
- whether dashboard filters are dashboard-global only or widget-level too → **both, with global as default** (Section 7.7)
- whether table widgets support pagination or only capped result rendering → **server-capped, client-paginated; no stateful cursors** (Section 7.4)
- default TTL per widget type for the 3.3 result cache → **scalar 10m, chart 5m, table 2m, ad hoc 0; ceiling 15m** (Section 3.3)
- whether admins can delegate external-client grant authority to analysts per folder → **no in MVP; admin-only** (Section 5.1)

Any new open questions that surface during spec work MUST be raised as constitutional amendments (Section 17), not resolved silently in feature specs.

---

## Governance

### 17. Amendment Rule

This constitution MAY be updated only when:

- the product scope changes materially,
- a technical decision is proven invalid,
- security or tenancy rules require tightening,
- or implementation evidence shows a rule is unrealistic.

Any amendment MUST be intentional and documented before dependent specs are rewritten.

### Versioning Policy

- **MAJOR**: Backward incompatible governance/principle removals or redefinitions.
- **MINOR**: New principle/section added or materially expanded guidance.
- **PATCH**: Clarifications, wording, typo fixes, non-semantic refinements.

### Compliance Review

- All feature specs MUST be checked against the Non-Negotiables (Section 15) before approval.
- All pull requests affecting tenancy, permissions, query execution, or secrets MUST reference the relevant constitutional section in the review.
- Complexity or deviation from constitutional rules MUST be justified explicitly and recorded with the feature spec.

**Version**: 1.2.0 | **Ratified**: 2026-04-16 | **Last Amended**: 2026-04-16
