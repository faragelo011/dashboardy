# Data Model: Query Engine

**Spec**: [spec.md](./spec.md) | **Constitution**: §3.3, §7.4, §7.6  

## Overview

Feature 4 adds two tenant-scoped Postgres tables: immutable **query execution audit** rows and ephemeral **cache entries**. Both are written only from **FastAPI** (service role); the Next.js app has no direct DB access to these tables.

Foreign keys reference existing tenancy and connection metadata where rows exist today; nullable FKs apply to assets not created until Features 5–6.

## Entity: `query_audit_logs`

Immutable line of accountability for every terminal query attempt (cached or live).

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID PK | |
| `tenant_id` | UUID NOT NULL | FK → `tenants.id`; align with app tenancy resolution |
| `workspace_id` | UUID NOT NULL | FK → `workspaces.id` |
| `user_id` | UUID NOT NULL | Supabase Auth user id |
| `connection_id` | UUID NULL | FK → `data_connections.id` for tenant’s connection (nullable via 0013 for pre-connection failures) |
| `saved_question_id` | UUID NULL | FK deferred until `saved_questions` exists — nullable + no FK constraint in F4 **or** FK with migration in F5 |
| `dashboard_id` | UUID NULL | Optional FK when widget/dashboard assets exist (F6) |
| `sql_hash` | CHAR(64) NOT NULL | Hex SHA-256 of canonicalized SQL text |
| `bound_parameters_hash` | CHAR(64) NOT NULL | Hex hash of sorted stable parameter projection (no raw PII) |
| `row_count` | INTEGER NOT NULL | Rows returned to client after cap (0 on pre-warehouse refusal) |
| `bytes_scanned` | BIGINT NULL | When Snowflake / driver exposes usage |
| `duration_ms` | INTEGER NOT NULL | End-to-end handling for request path |
| `cache_hit` | BOOLEAN NOT NULL | |
| `status` | ENUM / VARCHAR NOT NULL | `ok`, `timeout`, `row_limit_exceeded`, `rejected_by_parser`, `warehouse_error`, `authz_denied`, `warehouse_busy` |
| `error_code` | VARCHAR NULL | Normalized sub-code for UI/analytics |
| `created_at` | TIMESTAMPTZ NOT NULL | Default `now()` |

**Constraints & indexes**

- Index `(tenant_id, created_at DESC)` for operator queries and retention pruning.
- Consider index on `(connection_id, created_at DESC)` for ops.
- **Retention**: prune or partition so data **≥ 90 days** remains (constitution §7.6); implementation may use scheduled job.

**Rules**

- Exactly **one** insert per intentional execution attempt that reaches the audit writer (align spec FR-020 / exception for sudden process death).

## Entity: `cache_entries`

Short-TTL tenant-isolated materialized result payloads (optimization only).

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID PK | |
| `tenant_id` | UUID NOT NULL | FK → `tenants.id` |
| `connection_id` | UUID NOT NULL | FK → `data_connections.id` |
| `secret_version` | INTEGER NOT NULL | Copy from connection row at write time for rotation-sensitive keys (or equivalent rotation marker) |
| `cache_key` | VARCHAR(128) NOT NULL | Deterministic hash digest of identity components (hex or base64url fixed width) |
| `payload` | JSONB NOT NULL | Column metadata + row matrix; size-bounded by API policy |
| `expires_at` | TIMESTAMPTZ NOT NULL | |
| `presentation_class` | VARCHAR NOT NULL | `kpi`, `chart`, or `table` — drives default TTL class |
| `created_at` | TIMESTAMPTZ NOT NULL | |

**Constraints & indexes**

- UNIQUE `(tenant_id, cache_key)` — one live entry per identity.
- Index `(expires_at)` partial or B-tree for TTL sweeper deletes.

**Rules**

- Reads **must** occur only after successful **authorization re-check** for the calling principal and modality.
- Writes only for modalities where caching is allowed (**not** ad hoc).
- No cross-tenant `cache_key` reuse; `tenant_id` always part of logical key even if digest is globally unique.

## Relationships (conceptual)

```text
tenant 1──* query_audit_logs
tenant 1──* cache_entries
data_connections 1──* query_audit_logs
data_connections 1──* cache_entries
workspace 1──* query_audit_logs (via workspace_id)
```

`saved_question_id` / `dashboard_id` link to future Feature 5–6 tables when those land.

## State transitions

Neither table uses soft-delete for audit rows. **`cache_entries`** rows transition only: **active** (unexpired) → **deleted** (sweeper or invalidation).

Invalidation triggers (delete matching keys or entries): saved-question SQL/param change, credential rotation / `secret_version` bump, dashboard filter mapping change (when applicable), `bypass_cache` on miss path, natural expiry.

## Migration notes

- Single Alembic revision (or small sequence) under `apps/api/app/db/migrations/versions/` creating both tables, indexes, and CHECK or enum for `status` / `presentation_class` as appropriate.
