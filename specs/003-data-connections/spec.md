# Feature Specification: Data Connections + Credentials

**Feature Branch**: `003-data-connections`  
**Created**: 2026-04-29  
**Status**: Draft  
**Input**: User description: "From docs/implementation-plan.md, create a specification for Feature 3 only: Data connections + credentials."

## Clarifications

### Session 2026-04-29

- Q: When an admin creates or rotates credentials, when should those credentials become active? → A: New or rotated credentials become active only after a successful connection test.
- Q: Should admins be able to delete or disable the tenant data connection in MVP? → A: No delete or disable in MVP; admins can create, update, test, and rotate only.
- Q: What fixed connection statuses should the system expose? → A: `not_configured`, `pending_test`, `active`, `test_failed`.
- Q: What audit trail is required for connection and credential management? → A: Audit create, metadata update, test, and rotation attempts with actor, time, action, and outcome; no secrets.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Tenant Data Connection (Priority: P1)

An admin configures the tenant's single analytics data connection so analysts and downstream dashboard features can safely access approved business data.

**Why this priority**: Without a tenant data connection, later query, saved question, and dashboard workflows cannot run.

**Independent Test**: Can be fully tested by signing in as an admin, submitting valid connection details, and confirming the tenant has exactly one connection record with no credentials visible afterward.

**Acceptance Scenarios**:

1. **Given** an admin in a tenant with no configured data connection, **When** they submit valid connection metadata and credentials, **Then** the system stores the connection for that tenant and confirms the credentials are pending and will not be available for use until a successful connection test completes.
2. **Given** a tenant already has a data connection, **When** an admin attempts to create another connection for the same tenant, **Then** the system prevents the duplicate and explains that only one connection is allowed per tenant.
3. **Given** a non-admin user, **When** they attempt to create or edit a connection, **Then** the system denies the action.

---

### User Story 2 - Test and Monitor Connection Health (Priority: P2)

An admin tests the configured data connection and sees a clear status, last tested time, and sanitized error message when a test fails.

**Why this priority**: Admins need confidence that the connection works before authors and viewers depend on it.

**Independent Test**: Can be fully tested by configuring a connection, running a test with valid and invalid credentials, and confirming the status and error visibility match the result.

**Acceptance Scenarios**:

1. **Given** a configured connection with valid access details, **When** an admin runs a connection test, **Then** the system reports success and records when the test completed.
2. **Given** a configured connection with invalid or expired access details, **When** an admin runs a connection test, **Then** the system reports failure with a sanitized explanation that does not expose secrets.
3. **Given** an admin views the connection details, **When** the page loads, **Then** they can see connection metadata, status, and last test result without seeing secret values.

---

### User Story 3 - Rotate Credentials Safely (Priority: P3)

An admin rotates the connection credentials without exposing the old or new secret and expects subsequent data access to use the updated credentials promptly.

**Why this priority**: Credential rotation is required to maintain operational security without redeploying or disrupting tenant access longer than necessary.

**Independent Test**: Can be fully tested by rotating credentials, confirming no credential value is returned by the system, and validating that new access attempts use the rotated credentials within the required propagation window.

**Acceptance Scenarios**:

1. **Given** an admin is viewing an existing connection, **When** they submit replacement credentials and the connection test succeeds, **Then** the system activates the new credential reference and confirms rotation.
2. **Given** credentials were successfully rotated, **When** data access occurs within 60 seconds after the successful test, **Then** the system uses the updated credentials.
3. **Given** credentials are submitted or rotated, **When** the system responds or writes operational records, **Then** no plaintext credential values appear in responses, visible metadata, or logs.

---

### Edge Cases

- A tenant has no configured connection: users who depend on data access see a clear setup-required state instead of a generic failure.
- A connection test fails due to invalid credentials, unreachable warehouse, missing permissions, or timeout: admins receive a safe, actionable status without secret exposure.
- A create or rotation test fails: the submitted credentials do not become active, and the previous active connection state remains unchanged when one exists.
- A rotation is submitted while another rotation or update is in progress: the system preserves a consistent final connection state and does not mix credential references.
- An admin wants to remove or temporarily disable the tenant connection: the MVP does not support this action and keeps the active connection managed through updates and credential rotation.
- A user loses admin rights during a connection management session: subsequent management actions are denied.
- An audited connection action fails: the audit trail still records the actor, time, attempted action, and sanitized outcome without storing credential values.
- Display-only metadata changes must not accidentally require re-entering credentials unless credentials are being rotated.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow only admins to create, update, test, and rotate tenant data connections.
- **FR-002**: The system MUST enforce exactly one data connection per tenant.
- **FR-003**: The system MUST associate every data connection with exactly one tenant.
- **FR-004**: The system MUST collect the connection details needed to reach the tenant's approved analytics warehouse, including a human-readable name and non-secret warehouse location metadata.
- **FR-005**: The system MUST store credential material only in a dedicated secret store and retain only an opaque credential reference with the connection record.
- **FR-006**: The system MUST never return plaintext credential values in user-facing responses after submission.
- **FR-007**: The system MUST prevent plaintext credential values from appearing in operational logs, status messages, and validation errors.
- **FR-008**: Admins MUST be able to view connection metadata, current status, last tested time, and the most recent sanitized error.
- **FR-009**: Admins MUST be able to test submitted or configured connection details and receive a success or failure result.
- **FR-010**: Failed connection tests MUST preserve a sanitized error summary that is useful for troubleshooting without exposing secrets.
- **FR-011**: Admins MUST be able to rotate credentials for an existing connection without creating a second tenant connection.
- **FR-012**: New or rotated credentials MUST become active only after a successful connection test.
- **FR-013**: Failed create or rotation tests MUST leave the previous active connection state unchanged when one exists.
- **FR-014**: Successful credential rotation MUST take effect for subsequent data access within 60 seconds after the successful test.
- **FR-015**: The system MUST NOT provide delete or disable actions for tenant data connections in MVP.
- **FR-016**: The system MUST expose connection status using only `not_configured`, `pending_test`, `active`, or `test_failed`.
- **FR-017**: The system MUST audit create, metadata update, test, and rotation attempts with actor, time, action, and outcome.
- **FR-018**: Connection management audit records MUST NOT contain plaintext credential values.
- **FR-019**: Updating non-secret connection metadata MUST not expose, echo, or require existing credential values.
- **FR-020**: Unauthorized connection management attempts MUST be denied with a stable authorization-denied outcome.
- **FR-021**: Connection records MUST retain timestamps for creation and update, and MUST persist both `last_tested_at` (timestamp of the most recent test attempt, including failures) and `last_successful_test_at` (timestamp of the most recent successful test). On failed tests, `last_tested_at` updates while `last_successful_test_at` remains unchanged.

### Key Entities *(include if feature involves data)*

- **Data Connection**: A tenant-owned configuration that identifies the approved analytics warehouse location, display name, current status (`not_configured`, `pending_test`, `active`, or `test_failed`), credential reference, and test history.
- **Credential Secret**: Sensitive credential material stored outside normal connection records and referenced only through an opaque identifier.
- **Connection Test Result**: The latest outcome of a connection validation attempt, including success or failure, completion time, and sanitized error summary when applicable.
- **Connection Management Audit Record**: A security record of a connection create, metadata update, test, or rotation attempt, including actor, time, action, and sanitized outcome.
- **Tenant**: The business account boundary that owns exactly one data connection in the MVP.
- **Admin User**: A tenant member authorized to manage connection metadata, credential setup, testing, and rotation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of non-admin attempts to create, update, test, or rotate a connection are denied.
- **SC-002**: 100% of tenants have exactly one data connection record, and duplicate creation attempts are prevented so no additional records can exist.
- **SC-003**: 0 plaintext credential values appear in user-facing connection responses, stored connection metadata, test errors, or operational logs during validation.
- **SC-004**: Admins can complete initial connection setup and run the first connection test in under 5 minutes when they have valid credential information.
- **SC-005**: Successful credential rotations are reflected in subsequent data access within 60 seconds after the passing test.
- **SC-006**: At least 95% of failed connection tests return a categorized, sanitized failure reason that lets admins distinguish credential, network, permission, and timeout problems.
- **SC-007**: 100% of connection create, metadata update, test, and rotation attempts have a corresponding audit record with no plaintext credential values.

## Assumptions

- Feature 2 auth and tenancy are already available, including tenant resolution, workspace membership, and admin role checks.
- The MVP allows exactly one analytics warehouse connection record per tenant; multi-connection routing and shared connections are out of scope.
- Deleting or disabling a tenant connection is out of scope for MVP; connection changes happen through metadata updates and credential rotation.
- Credential values are accepted only during create or rotate actions and are not retrievable afterward.
- Connection metadata may include warehouse, database, and schema labels because they help admins recognize the configured target and are not treated as secrets by default.
- Downstream query execution is not part of this feature, except for proving that credential rotation becomes available to later data access within the required window.
