## Auth + Tenancy OpenAPI contract (Feature 2)

This directory contains the OpenAPI 3.1 contract for Feature 2: auth context (`/me`), one-workspace MVP switch stub (`/workspaces/switch`), admin member management, and external asset grants.

### Files

- `auth-tenancy.openapi.yaml`: source of truth contract for Feature 2 endpoints and schemas.

### How to use this contract

- **Backend implementers**: keep FastAPI route behavior aligned with the responses and `error_code` semantics defined in the contract.
- **Frontend implementers**: treat the contract as the canonical shape for request/response payloads and the list of expected `error_code` values.
- **Tests**: contract coverage lives under `apps/api/tests/contract/` (e.g. `test_me_contract.py`, `test_members_contract.py`, `test_asset_grants_contract.py`, `test_workspace_switch_contract.py`).

### Updating behavior

When changing API behavior or payload shapes:

1. Update `auth-tenancy.openapi.yaml` first (contract-driven).
2. Update API handlers/services to match.
3. Update contract tests to reflect the new contract.
4. Align shared TypeScript types in `packages/types/src/auth-tenancy.ts` for any exported shapes used by the web app.

