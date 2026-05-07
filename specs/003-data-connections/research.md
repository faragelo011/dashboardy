# Research: Data Connections + Credentials

**Feature**: 003-data-connections  
**Date**: 2026-04-29

## Decision: Store connection metadata in Supabase Postgres and credential material only in Supabase Vault

**Rationale**: The constitution requires Supabase Vault for Snowflake credentials and forbids plaintext secrets in normal app tables, responses, logs, traces, and audit records. Keeping app-visible fields limited to metadata and an opaque Vault reference preserves admin visibility without exposing credential material.

**Alternatives considered**:

- Store encrypted credentials in `data_connections`: rejected because the constitution names Supabase Vault as the authoritative secret store for Snowflake credentials.
- Store credentials in environment variables: rejected because tenant credentials must be managed and rotated without redeploys.
- Return credential values for editing: rejected because the spec requires one-way submission with no echo after create/rotate.

## Decision: Activate new or rotated credentials only after a successful connection test

**Rationale**: The clarification session chose a fail-safe lifecycle: submitted credentials remain pending until validated. Failed create or rotation attempts must preserve the previous active connection state when one exists, reducing accidental outage risk.

**Alternatives considered**:

- Activate immediately before testing: rejected because mistyped or under-permissioned credentials could break downstream execution.
- Let admins choose activation mode: rejected for MVP because it increases branching states and testing burden without clear value.

## Decision: Use fixed connection statuses `not_configured`, `pending_test`, `active`, and `test_failed`

**Rationale**: A small status vocabulary keeps the admin UI, API contract, data model, and tests aligned. It also avoids overloaded generic states that hide whether credentials are waiting for validation or failed validation.

**Alternatives considered**:

- Use only `active` and `error`: rejected because it cannot represent pending credential submission.
- Add `rotating`: rejected because rotation can be represented by `pending_test` until the new secret passes.
- Derive display from latest test result only: rejected because downstream code needs a stable machine-readable status.

## Decision: Audit every connection management attempt without secrets

**Rationale**: Connection and credential management is security-sensitive. Auditing create, metadata update, test, and rotation attempts with actor, time, action, and outcome provides accountability while preserving the no-secret rule.

**Alternatives considered**:

- Audit only successful create/rotation: rejected because failed attempts are operationally and security relevant.
- Skip audit until query execution: rejected because credential management is a separate sensitive workflow.

## Decision: Model connection testing as an admin management operation, not query execution

**Rationale**: Feature 3 must prove credentials can reach Snowflake but must not introduce Feature 4 query engine concerns. The test should use a bounded connectivity check with sanitized categorized outcomes and must not persist BI result data.

**Alternatives considered**:

- Reuse the future query engine: rejected because it would violate build order by pulling Feature 4 into Feature 3.
- Perform no live connectivity test: rejected because the spec requires admins to validate the connection before activation.

## Decision: Invalidate local connection holders within 60 seconds after successful rotation

**Rationale**: The implementation plan and constitution require new executions to use rotated credentials within 60 seconds. Feature 3 should expose the metadata/version signal and service behavior needed for later query execution to drop stale holders.

**Alternatives considered**:

- Require process restart after rotation: rejected because rotation must not require redeploys.
- Immediate global invalidation across all future instances: deferred because distributed query execution arrives later; Feature 3 defines the contract and local behavior required by Feature 4.

## Decision: Keep delete and disable out of MVP

**Rationale**: The clarification session explicitly limits MVP actions to create, update, test, and rotate. This preserves a simpler one-connection invariant and avoids undefined downstream no-active-connection recovery flows.

**Alternatives considered**:

- Allow disable: rejected because it adds an unavailable state not required by the source plan.
- Allow delete: rejected because it conflicts with the clarified MVP lifecycle and complicates audit/secret cleanup semantics.
