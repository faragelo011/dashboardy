# Data Connections OpenAPI Contract

Primary artifact: [`data-connections.openapi.yaml`](./data-connections.openapi.yaml).

## How to consume it

- **HTTP clients**: generate a client against this file (`openapi-typescript`, `openapi-generator`, etc.) using the Bearer security scheme aligned with Feature 2 Supabase JWTs.
- **Feature 3 semantics**: responses intentionally omit credential fields (`SnowflakeCredentials` properties are write-only); do not extend response schemas with `vault_secret_id`, passwords, PEM material, or raw Vault identifiers.
- **Workspace path parameter**: `{workspace_id}` is a UUID. The caller must have an active membership for that workspace; admin role is required for every operation in this contract.

## Implementation caveats (vs a naïve client)

| Contract area          | Practical behavior                                                                                                                                                                                                                                                                 |
|------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `401`/`403`            | Implemented using the Feature 3 route layer on top of Feature 2 auth. Non-admins typically receive `authz_denied` (403); missing/invalid JWT returns `auth_required` (401). Other tenancy codes (`no_membership`, `inactive_membership`) may appear as 403 on these routes too. |
| `409 Conflict` on PUT  | Raised when enforcing the one-connection-per-tenant invariant in edge cases surfaced as `connection_conflict`. Normal metadata updates reuse the existing row instead of conflicting.                                                                                                                                     |
| `503` responses        | Not shown on every operation in YAML; runtime may return **`dependency_unavailable` (503)** when Vault-related env vars are missing or Vault cannot be reached for requests that persist or read credential material (`PUT` with credentials, `POST …/test`, `POST …/rotate`). |
| `400` validation       | Rejected payloads can include a `validation_error`-style envelope with **`details`** (FastAPI normalization). Treat `details` as diagnostic only, never as containing secrets.                                                                                                                                      |
| `ConnectionStatus`      | Empty tenant state uses **`not_configured`** from `GET`; after credential submission without a passing test use **`pending_test`**; **`test_failed`** is used after unsuccessful tests until a subsequent successful activation path clears it according to server rules.        |
| `has_credentials`      | Derived from persisted metadata—the API does **not** echo whether pending vs effective secret exists separately; admins infer pending work from `pending_test` and rotation copy.                                                                                                                                   |
| `secret_version`       | Monotonic-ish marker used for downstream cache invalidation; not a Vault version and not a credential.                                                                                                                                                                            |
| `last_error`           | Always treat as sanitized copy for admins; failures from testing/rotation must not expose stack traces or raw connector errors.                                                                                                                                                    |
| Response headers       | Implementations SHOULD emit **`X-Correlation-ID`** for tracing; correlate support tickets to JSON log lines keyed by middleware.                                                                                                                                                    |

Contract version `0.3.0` should change when breaking response shapes or error codes ship; additive optional fields generally stay compatible.
