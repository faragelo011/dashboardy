# Feature Specification: Query Engine

**Feature Branch**: `004-query-engine`  
**Created**: 2026-05-08  
**Status**: Draft  
**Input**: User description: "From docs/implementation-plan.md, create a specification for Feature 4 — Query engine ONLY."

## Clarifications

### Session 2026-05-08

- Q: Which membership roles may invoke query execution during Feature 4 delivery? → A: Ad hoc SQL execution is limited to internal authoring roles (`admin`, `analyst`). `viewer` and `external_client` cannot run ad hoc SQL in this milestone. Future saved-analysis/dashboard execution may include viewers only through asset-scoped orchestration that supplies an explicit authorization allowance.

## Scope

### In scope

Safe, observable, bounded execution for analytics queries toward the tenant’s approved warehouse: structural validation before execution, capacity-aware scheduling, immutable execution audit records, optional result caching subject to eligibility rules, typed outcomes for callers, and parameterized execution without injecting raw user text into queries.

Minimal internal-facing means to invoke ad hoc execution for verification prior to reusable-saved-analysis and dashboard features; only **internal authoring roles** (`admin`, `analyst`) may run ad hoc SQL. **`viewer`** and **`external_client`** are barred from ad hoc SQL in this milestone. Later saved-analysis/dashboard orchestration may allow viewers only after asset grants and saved SQL ownership are enforced end-to-end.

### Explicitly out of scope (defer to downstream features)

- Collection and saved-analysis authoring, versioning, cloning, lifecycle, and CSV export flows.
- Dashboard assembly, layouts, widgets as product UI, filter-bar UX, sharing rules beyond what the execution request already carries.
- Direct ad hoc SQL execution by **`viewer`** or **`external_client`** members during this milestone; later work may expose permitted saved-analysis or dashboard modalities only through layered flows that enforce explicit grants.

This specification still defines future execution **modes** and identifiers those features will attach so integration does not reshape the engine contract later. Feature 4 may persist the cache/audit foundations for those modes, but it MUST NOT claim production saved-analysis or widget execution until the owning asset features exist.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Author runs an ad hoc read-only analytics query (Priority: P1)

An authorized internal author submits a parameterized read-oriented query against the tenant’s configured analytics connection when exploring data. The system validates structure, refuses unsafe patterns, executes only after capacity is available within policy, enforces limits, writes an audit trail, returns tabular columns and capped rows along with truncation and outcome metadata.

**Why this priority**: Unsafe or uncontrolled execution jeopardizes tenancy, warehouse cost, and compliance; ad hoc exploration is how authors validate semantics before reusable assets exist.

**Independent Test**: Authorized representative triggers an ad hoc execution with an allowed SELECT-style submission and observes success; repeats with a forbidden pattern and observes refusal with a refusal outcome; observes every attempt recorded in audit with no plaintext secret or raw personal values in parameterized audit fields.

**Acceptance Scenarios**:

1. **Given** a tenant with no configured analytics connection usable for execution, **When** an authorized user requests execution, **Then** the system refuses with an outcome that distinguishes setup-required or misconfiguration rather than implying a validated query failed in the warehouse.
2. **Given** an authorized user with a usable tenant connection and a structural pattern that violates read-only,single-intent submission rules (for example alteration, session context change, or multiple executable statements), **When** execution is requested, **Then** the system refuses **before** dispatch to the warehouse, returns a refusal outcome, and writes an audit record with refusal status.
3. **Given** an authorized user and a compliant read-oriented submission, **When** execution succeeds within row and time ceilings, **Then** returned results include stable column identifiers, row values capped to policy, truncation indication when capped, elapsed duration envelope, approximate row counts as policy allows, and **no** plaintext credential disclosure.
4. **Given** an authorized user and a compliant submission, **When** warehouse execution exceeds the published time ceiling or returns a constrained row overflow, **Then** outcomes are surfaced as bounded timeout or bounded row overflow—not generic failures—and audit rows reflect status.
5. **Given** parameterized execution where every filter value must correspond to declared parameters, **When** the caller binds unknown names, omits required bindings, or supplies values incompatible with declarations, **Then** refusal occurs before warehouse dispatch and audit reflects validation failure semantics.

---

### User Story 2 - Internal operator observes query activity and fairness under load (Priority: P2)

Operations and product owners need executions to degrade predictably under load—bounded waiting, refusal when overcrowded—with clear outcomes that separate capacity from authorization and warehouse malfunction.

**Why this priority**: Multi-tenant analytics contention without policy leads to cascading failures and unbounded cost exposure.

**Independent Test**: Run concurrent executions up to nominal capacity plus one saturated wait-path; observe at least one request receiving a deterministic busy refusal before silent failure; unrelated tenants must not bleed outcome confusion when keys differ.

**Acceptance Scenarios**:

1. **Given** concurrency at the published simultaneous execution ceiling for one running service replica, **When** another execution request arrives within wait policy bounds, **Then** either it proceeds once capacity frees within the bounded wait tolerance or declines with busy outcome without corrupting unrelated tenant requests.
2. **Given** the waiting buffer is saturated or inbound wait elapsed without acquiring capacity, **When** a submission arrives or a wait expires, **Then** decline with busy outcome distinguishes capacity from refusal-by-validation.

---

### User Story 3 - Cache foundation for future reusable executions (Priority: P3)

The engine prepares the tenant-scoped cache store, identity builder, TTL policy, and read/write helpers needed for future saved-analysis and dashboard executions. Reuse is forbidden for ad hoc SQL, and production cache hits for saved-analysis/widget modes must wait until those asset features can provide authoritative SQL, parameter declarations, and asset-scoped authorization.

**Why this priority**: Re-running heavy warehouse workloads for repetitive dashboard-grade requests harms responsiveness and economics.

**Independent Test**: Cache identity, TTL resolution, janitorial expiry, and authorization re-check helpers can be exercised with service-level fixtures. Ad hoc execution never reads or writes cache entries. Saved-analysis/widget runtime requests either return a documented `feature_not_available`/`saved_question_not_implemented` outcome with audit, or remain disabled until Features 5-6 supply authoritative asset context.

**Acceptance Scenarios**:

1. **Given** ad hoc exploratory execution mode policy, **When** identical submissions repeat, **Then** caching does not shorten warehouse work, no cache entry is written, and audit rows record `cache_hit=false`.
2. **Given** a future cache-eligible request identity is constructed by service-level fixtures, **When** TTL policy is evaluated, **Then** the identity includes tenant, connection, credential-version, SQL hash, parameter hash, mode, and relevant asset/filter identifiers while respecting the 15-minute ceiling and presentation-class defaults.
3. **Given** a cached payload helper is invoked for a future eligible mode, **When** authorization re-check fails, **Then** the helper refuses to return cached rows and records guarded non-reuse semantics.
4. **Given** cached entries have expired, **When** the janitorial path runs, **Then** stale rows are deleted without touching audit records.

---

### Edge Cases

- Empty result sets with successful warehouse completion distinguish **ok** semantics from truncation vs timeout.
- Very wide result schema or oversized cell payloads constrained by downstream row cap and truncation flags.
- Connection credential propagation delay after rotation elsewhere: executions must converge on current approved wiring without indefinite stale credential attachment beyond the mandated propagation window inherited from credential management specifications.
- Malformed textual submission that cannot parse to a deterministic structure: refusal before warehouse with stable parsing-refusal taxonomy.
- Colliding cache identities due to hashing strategy: negligible practical probability; collisions must skew toward miss not cross-tenant data exposure through mandatory tenant and connection discriminators embedded in authoritative cache identity conceptual model.
- Optional administrative capture of sanitized debug text for investigations must never reside in immutable general audit payloads when raw submission text retention is undesirable; segregation of privileged forensic records from standard audit readability is acceptable but not mandatory for MVP if general audit omission holds.
- Long-running benign queries stopped by ceiling: distinguish timeout from user cancellation semantics if cancellation is surfaced later elsewhere.
- Byte or scan accounting unavailable from the analytics connectivity layer: nullable accounting fields permissible while duration and counts still populate wherever measurable.
- **`viewer`** or **`external_client`** membership invokes ad hoc execution: refusal with authorization categorical outcome prior to parser or warehouse dispatch **without** requiring a synthesized passing authorization precondition upstream.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept ad hoc exploration execution requests in this milestone and MAY expose contract-compatible request shapes for future **reusable saved analysis execution** and **dashboard tile scoped execution** without executing those modes until owning asset features provide authoritative SQL, parameter declarations, and authorization.
- **FR-002**: Before any warehouse dispatch for a tenant-bound request, authentication context MUST resolve tenant, workspace, authenticated principal identifier, and membership role from the platform tenancy model. Ad hoc SQL dispatch is allowed only for internal authoring roles (**`admin`**, **`analyst`**) with an explicit allowed authorization precondition. Principals holding **`viewer`** or **`external_client`** role MUST NEVER reach structural validation or warehouse dispatch for ad hoc SQL in this milestone—the system MUST deny with categorical authorization refusal while still emitting immutable audit attribution where identifiers exist. Future saved-analysis/widget dispatch MAY include **`viewer`** only when orchestrating layers supply an explicit asset-scoped authorization allowance; absent that allowance, the engine MUST short-circuit before structural validation or warehouse touches.
- **FR-003**: Authorized requests MUST locate the tenant’s single approved analytics connection record and hydrate execution context without surfacing credential material to callers or embedding secrets in generalized audit payloads.
- **FR-004**: Structural validation MUST reject multi-statement or multi-root submissions, disallow non-read top-level intents (including data modification or schema lifecycle commands), disallow session or entitlement mutation patterns per published deny-pattern catalog exercised by golden conformance scenarios.
- **FR-005**: Structural validation MUST canonically normalize allowable submissions strictly for hashing and identity purposes without altering semantic intent beyond documented canonicalization safeguards.
- **FR-006**: Parameter binding MUST require every runtime filter value correspond to declared parameters for modes supplying declarations; forbids freestyle concatenation of raw user literals into textual query bodies.
- **FR-007**: Parameter binding hashing for audit MUST cover sorted stable name/value type projection without retaining raw sensitive personal literals in generalized audit payloads.
- **FR-008**: Immutable execution audit MUST record tenant, workspace, acting user, connection surrogate, saved-analysis identifier nullable, dashboard identifier nullable, stable structural hash surrogate, stable bound-parameter hash surrogate, realized row cardinality, approximate byte or scan telemetry when available nullable, elapsed duration milliseconds, utilization of reuse pathway boolean, categorical completion status aligning to outcome glossary, normalized secondary error discriminator nullable, authoritative timestamp—and retention MUST honor **no less than 90 days**.
- **FR-009**: Authorized cache reuse pathway MUST derive authoritative identity from minimally tenant, connection materialization marker sensitive to credential rotation surrogate bump, structural hash surrogate, binding hash surrogate, saved-analysis vs ad hoc modality discriminator, scoped dashboard tile identifiers when dashboard modality, and consolidated filter-equivalence hashing when applicable downstream.
- **FR-010**: Cache entry payload records MUST segregate authoritative identity, expiry instant, modality classification aiding differential time-to-live classing, persisted tabular encapsulation constrained to ephemeral reuse—not authoritative warehouse duplication beyond TTL maintenance.
- **FR-011**: Cache reuse helpers for future eligible modes MUST repeat authorization precondition evaluation before returning rows; failure MUST convert to guarded non-reuse semantics—not silent historical row surfacing.
- **FR-012**: Authorized reuse suppression triggers MUST include substantive saved-analysis textual or parameter-definition mutation, credential rotation materially altering warehouse access context, substantive dashboard-global or tile-level filter linkage changes per downstream definitions, caller bypass flag activation, TTL natural expiry—and scheduled janitorial deletion of stale rows MUST operate automatically once those modes are enabled.
- **FR-013**: Eligibility matrix MUST disallow reuse for **ad hoc exploration** modality; MUST define differentiated TTL ceilings by presentation class for future reusable modes—with higher stability class not exceeding fifteen minutes authoritative ceiling—with workspace-level downward-only shortening never raising above modality default ceiling—and table-oriented presentations receiving shortest refresh class reflecting volatility expectations.
- **FR-014**: Scheduling MUST impose a simultaneous active execution ceiling per deployment instance with bounded-depth waiting ingress and bounded wall-clock willingness to acquire a slot, refusing with a busy categorical outcome when overcrowded; published guidance MUST state how total capacity aggregates when multiple instances run independently until centralized coordination exists.
- **FR-015**: Warehouse dispatch MUST impose a bounded execution dwell ceiling aligning with analytic responsiveness expectations circa half a minute and MUST enforce maximal returnable row truncation with explicit truncation signaling.
- **FR-016**: Responses MUST return column schema summary, capped row tabular envelope, enumerated completion status taxonomy (`ok`, `timeout`, `row_limit_exceeded`, `rejected_by_parser`, `warehouse_error`, `authz_denied`, `warehouse_busy`), optional normalized auxiliary error discriminator, summarized meta including duration span, observed row cardinality, truncation flag parity.
- **FR-017**: System MUST expose a minimal internal-facing execution surface exercising core pathways without implying completion of authoring or dashboard milestones.
- **FR-018**: Parser gap residual risk acknowledgment: structural validation complements—but does not replace—least-privilege warehouse entitlements mandated cross-feature.
- **FR-019**: Multi-tenant analytic fairness: concurrency and refusal semantics MUST not leak deterministic cross-tenant row payloads through reused cache envelopes—identity segregation non-negotiable.
- **FR-020**: Observability completeness: EVERY terminal execution attempt produces exactly one authoritative audit lineage row prior to outward response emission except catastrophic process loss outside application control (explicitly documenting best-effort boundary).

### Key Entities *(include if feature involves data)*

- **Execution Request**: modality discriminator, textual or referenced analytical intent, declarative bindings map where applicable, optional saved-analysis surrogate, optional dashboard tile scope, consolidated filter hashing inputs when modality demands, reuse bypass directive.
- **Structural Validation Policy**: enumerated acceptance and rejection pattern catalog underpinning conformance tests.
- **Execution Audit Fact**: immutable observability lineage capturing tenancy, attribution, hashing surrogates, cardinality, durations, reuse flag, categorical completion, ancillary code, provenance timestamps.
- **Ephemeral Cached Answer**: TTL-bounded encapsulated tabular artifact keyed by authoritative identity projection tied to modality class.
- **Scheduling Gate**: coupling of concurrency ceiling with depth-bounded waiter admission and deterministic busy refusal taxonomy.
- **Completion Outcome**: standardized vocabulary aligning user-visible explainability categories.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% conformance golden scenarios distinguish allowed vs forbidden structural submissions with zero warehouse dispatch occurring on rejected structural classes during validation suite execution.
- **SC-002**: Synthetic load reproducibly demonstrates deterministic busy categorical outcome—not generic server failure—for at least one overcrowding scenario exceeding buffered wait ingress or dwell patience without data corruption indications.
- **SC-003**: Cache foundation regression harness proves deterministic identity, TTL class selection, expiry deletion, and authorization re-check behavior for future reusable modes; **ad hoc modality never records reuse affirmative** in audits across harness repetitions unless eligibility policy expands in a later approved spec.
- **SC-004**: Unauthorized precondition synthetic execution attempts ≥99% finalize with categorical authorization refusal prior warehouse dispatch retaining audit discriminability excluding infrastructure fault injections.
- **SC-005**: Audit completeness sampling across randomized mixed-outcome bursts ≥99.5% single-row lineage coverage per intentional attempt excluding abrupt runtime termination simulations.
- **SC-006**: Operational operators complete primary golden-path exploratory execution—from submission to outcome comprehension including truncation awareness—in under ninety seconds median during usability dry-run scripted walkthrough excluding genuine warehouse cold-start outliers.

## Assumptions

- Upstream tenancy resolution, membership roles, centralized permission evaluation services, single-tenant-connection invariant, credential material held only in the platform secret store, and authenticated user identities established through the platform sign-in flow remain prerequisites.
- Ad hoc SQL execution callers in this milestone are limited to **`admin`** and **`analyst`**. **`viewer`** and **`external_client`** ad hoc execution is forbidden by constitution role semantics and deferred orchestration.
- Downstream authoring features supply canonical parameter declaration JSON shape later; MVP engine may ingest service-level fixtures for saved-analysis/widget cache helper tests, but production execution for those modes must return an explicit unavailable/not-implemented outcome until full CRUD and asset authorization exist.
- Filter consolidation hashing semantics for dashboards finalize with dashboard milestone; interim identity inputs may stabilize on explicit caller-supplied deterministic digest until binding formalization merges.
- Byte scanned telemetry optional contingent on analytics connectivity reporting capabilities; omission does not regress completion fidelity.
- Optional segregated privileged raw-text diagnostic persistence remains opt-in investigative tooling not blocking baseline audit rollout.
- A minimal internal “run query” verification entry point (or isolated UI harness) satisfies FR-017 without consumer-grade polish mandate.
