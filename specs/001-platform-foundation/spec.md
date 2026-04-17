# Feature Specification: Platform Foundation

**Feature Branch**: `001-platform-foundation`  
**Created**: 2026-04-17  
**Status**: Draft  
**Input**: User description: "Phase 1 of the Dashboardy implementation plan — foundation and platform baseline: monorepo, CI/CD, identity-free app skeletons for web and API, environment-variable contract, database migration pipeline, health and readiness endpoints, structured logging, and deploy baseline to staging."

## Clarifications

### Session 2026-04-17

- Q: How does a release artifact that has deployed to staging reach production? → A: Manual approval step in the pipeline; same release artifact; no automatic promotion.
- Q: What is the latency target for the API liveness endpoint under normal conditions? → A: 100 ms.
- Q: What happens when two deploys target the same environment simultaneously? → A: Serialize — the second deploy waits in a queue and runs only after the first finishes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deploy the platform to staging from a tagged release (Priority: P1)

A platform engineer cuts a release tag on the main branch. The release pipeline automatically builds both the web container and the API container, and deploys them to the staging environment. Both containers come up and report healthy. The engineer can load a placeholder home page served from the web container, and the web container is configured to reach the API container.

**Why this priority**: Without a repeatable deploy path to staging there is no platform — every subsequent feature needs a place to run. This is the single highest-value slice of the foundation.

**Independent Test**: From a clean staging environment, cut a release tag against a known-good main commit. Observe the pipeline produce images, apply any pending migrations, roll out the API container, roll out the web container, and report healthy. Open the staging web URL and confirm the placeholder page renders.

**Acceptance Scenarios**:

1. **Given** a clean staging environment and a release tag on main, **When** the pipeline runs to completion, **Then** both web and API containers are running and return healthy status.
2. **Given** a successful staging deploy, **When** the engineer opens the staging web URL in a browser, **Then** the placeholder home page loads within normal page-load expectations.
3. **Given** a failed build (for example a compile error), **When** the pipeline runs, **Then** no deploy is attempted to staging and the existing running version is untouched.

---

### User Story 2 - Apply database migrations safely before rolling out the API (Priority: P1)

An engineer merges a schema change onto main. The pipeline applies the migration against the target environment's application database, and only after that completes successfully does it roll out the API container. If the migration step fails, the previous API container continues to serve traffic and the deploy is marked failed.

**Why this priority**: The platform will accumulate schema over every later phase. A safe, versioned, reversible-or-forward-fix migration workflow is non-negotiable and must be proven before any domain data exists.

**Independent Test**: Submit a deliberately failing migration (for example, referencing a missing column). Observe that the migration step fails, the deploy is aborted, and the prior API container continues to respond healthy. Then submit a valid migration; observe it is applied exactly once and the new API container rolls out.

**Acceptance Scenarios**:

1. **Given** a valid migration in the release artifact, **When** the deploy runs, **Then** the migration is applied to the target database exactly once before the API container is rolled out.
2. **Given** a failing migration in the release artifact, **When** the deploy runs, **Then** the pipeline aborts before replacing the API container and the existing API continues to serve traffic.
3. **Given** a migration has already been applied to the target environment, **When** the same pipeline runs again, **Then** the migration is recognized as applied and not re-run.
4. **Given** a schema change that lacks a safe reverse migration, **When** the release is prepared, **Then** the release artifact includes a documented forward-fix plan for that change.

---

### User Story 3 - Observe platform health and trace requests (Priority: P2)

An on-call operator needs to know, at any moment, whether the staging or production deployment is healthy. The API exposes a liveness endpoint and a readiness endpoint. Readiness reflects whether the API can actually reach its backing database. The web container exposes a liveness endpoint. Logs from the API are structured and carry a correlation identifier per request, so a single request can be traced through the logs.

**Why this priority**: Diagnostics and safe rollout depend on this. It is second only because the platform can be deployed once before health endpoints are wired, but must not be run for users without them.

**Independent Test**: Hit the liveness endpoint on both containers and confirm a fast positive response. Stop the application database briefly and confirm readiness flips to not-ready on the API within seconds. Issue an API request and confirm the resulting log line includes a correlation identifier that matches the response.

**Acceptance Scenarios**:

1. **Given** a running API container with a healthy database connection, **When** the liveness endpoint is called, **Then** it returns a healthy response within 100 milliseconds.
2. **Given** a running API container whose database connection is broken, **When** the readiness endpoint is called, **Then** it returns a not-ready response within 5 seconds of the loss.
3. **Given** any request to the API, **When** it is processed, **Then** the structured log entries for that request include a single correlation identifier that also appears in the response.

---

### User Story 4 - Configure every environment safely through environment variables (Priority: P2)

A platform engineer sets up a new environment by supplying environment variables only. All required variables are documented in a single reference. Missing or empty required variables cause the container to exit at startup with a clear message that names the missing variable. No secret values live in the repository. No secret values appear in logs.

**Why this priority**: The platform has two environments (staging and production) and must support credential rotation without code changes in later phases. Getting the environment contract right at phase 1 prevents silent misconfiguration later.

**Independent Test**: Deploy a container with a required environment variable deliberately omitted and confirm the container exits with a message naming that variable. Inspect the repository for any secret values and confirm none exist. Inspect logs from a healthy run and confirm no secret appears.

**Acceptance Scenarios**:

1. **Given** a container is started with all required environment variables present, **When** it starts, **Then** it comes up healthy without further configuration.
2. **Given** a container is started with a required environment variable missing or empty, **When** it starts, **Then** it exits within a few seconds with an explicit error message that names the missing variable.
3. **Given** the repository at any commit, **When** it is scanned for secret values, **Then** no production-usable secret is present.
4. **Given** a healthy running container, **When** logs are inspected, **Then** no secret value from any environment variable appears in any log line.

---

### Edge Cases

- The application database is unreachable at container startup. Readiness must reflect not-ready and must not wedge the container in a crash-loop that loses useful logs; liveness can still succeed.
- The migration step exceeds a configured time bound. The deploy must fail cleanly without leaving the database in an unknown state and without replacing the running API container.
- The image build fails. No deploy is attempted and the previous running version is untouched.
- A rollback is needed after a bad deploy. A documented rollback procedure exists and restores the previous running image without requiring a fresh build.
- An engineer tries to apply a schema change through a non-versioned path (for example directly through a database admin UI) in production. The platform's operational rules forbid this outside of incident response and require back-porting to a migration within the same working day.
- A secret needs to be rotated. It can be rotated by updating the environment-variable source alone, without a code change.
- Two environments diverge because a migration was applied to one but not the other. The workflow must apply migrations identically to staging and production.
- Two deploys are triggered against the same environment in quick succession. The pipeline must serialize them so that the second begins only after the first completes; concurrent migration or rollout against the same environment is forbidden.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The codebase MUST be organized as a single versioned repository with clear boundaries between the web application, the API application, and shared packages used by both.
- **FR-002**: Every change merged into the main branch MUST trigger an automated pipeline that builds, tests, and produces deployable images for both the web application and the API application.
- **FR-003**: A platform engineer MUST be able to start the web application and the API application locally with a single documented command per application.
- **FR-004**: All application database schema changes MUST go through versioned migration files that are committed to the repository and applied identically to staging and production.
- **FR-005**: Each migration MUST be either independently reversible or accompanied by a documented forward-fix plan stored alongside the release.
- **FR-006**: The API application MUST expose a liveness endpoint and a readiness endpoint; readiness MUST reflect the API's ability to reach the application database.
- **FR-007**: The web application MUST expose a liveness endpoint.
- **FR-008**: The API application MUST emit structured log entries with a correlation identifier per request, and that identifier MUST be returned to the caller so one request can be traced end to end.
- **FR-009**: All per-environment configuration MUST be supplied through environment variables; the full set of required and optional variables MUST be documented in a single reference location in the repository.
- **FR-010**: If any required environment variable is missing or empty at startup, the affected container MUST exit with an error message that names the missing variable.
- **FR-011**: No secret value MAY be committed to the repository, stored in plaintext in application tables, logged, or returned in any API response or error payload.
- **FR-012**: A release tag on main MUST trigger deployment of both applications to staging automatically. Promotion of the **same** release artifact to production MUST require an explicit manual approval step in the pipeline; production rollout MUST NOT begin until that approval is recorded.
- **FR-013**: The deploy pipeline MUST run pending database migrations against the target environment before rolling out the API application; if the migration step fails, the deploy MUST abort and the previous API instance MUST remain in service.
- **FR-014**: A documented rollback procedure MUST exist that restores the previously running release without requiring a fresh build.
- **FR-015**: The only environments supported by the foundation are staging and production; a local development mode MAY exist for engineers but is not a deploy target.
- **FR-016**: The deploy pipeline MUST serialize deploys per environment: if a deploy is in flight against a given environment, any subsequent deploy targeting the same environment MUST wait until the first completes (success or failure) before starting. Concurrent migrations or container rollouts against the same environment are forbidden.

### Key Entities

Not applicable to this phase. The foundation introduces no domain entities; domain data begins in the next phase (identity and tenancy).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A platform engineer who has never deployed the system before can follow the documented procedure and complete a staging deploy from a tagged release in under 30 minutes on a typical internet connection.
- **SC-002**: At least 95 percent of main-branch merges produce a deployable build artifact within 10 minutes of the merge commit.
- **SC-003**: A deliberately failing migration aborts the deploy without replacing the running API application and without causing an observable outage on the previous version.
- **SC-004**: The API readiness endpoint returns within 500 milliseconds under normal conditions and flips to not-ready within 5 seconds of losing the application database. The API liveness endpoint returns within 100 milliseconds under normal conditions.
- **SC-005**: A container started without a required environment variable exits within 5 seconds with an error message that unambiguously names the missing variable.
- **SC-006**: The documented rollback procedure restores the previously running release end-to-end within 10 minutes when followed by an on-call operator.
- **SC-007**: Across 30 consecutive days of staging operation, zero secret values appear in any log output, any API response, or any file in the repository.

## Assumptions

- A managed application database exists, or will be provisioned in parallel to this phase, for staging and for production; its connection information will be supplied to the pipeline as environment variables.
- A container-hosting environment exists, or will be provisioned in parallel, capable of running both the web application and the API application for staging and production.
- A managed credential store exists for later phases to consume; this phase does not yet read from it and only proves that environment-variable delivery is consistent and secret-safe.
- End-user authentication, tenants, workspaces, memberships, permissions, data connections, and query execution are all out of scope for this phase. They arrive in later phases.
- The only environments covered by this phase are staging and production; ephemeral per-branch preview environments are not required.
- Reversible migrations are preferred; forward-fix-only migrations are permitted when reverse migrations are not safe, subject to the rule above.
