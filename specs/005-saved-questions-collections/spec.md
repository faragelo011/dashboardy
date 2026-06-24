# Feature Specification: Saved Questions and Collections

**Feature Branch**: `005-saved-questions-collections`  
**Created**: 2026-06-01  
**Status**: Draft  
**Input**: User description: "C:\Users\KhaledFarghaly\Desktop\dashboardy\docs\implementation-plan.md - create a specification for Feature 5 -- Saved questions + collections ONLY."

## Scope

### In scope

Reusable saved questions organized in flat collections for one workspace, including collection lifecycle, saved question authoring, parameter definitions, permission-filtered list and detail views, execution of saved questions through the existing governed query pathway, cloning into permitted collections, and synchronous CSV export subject to role and asset permission.

Collection access is inherited by saved questions, and saved questions may only widen access explicitly. Collection and question grants support `view` and `edit` permission levels; export permission is controlled separately. There is no deny rule, nested collection hierarchy, dashboard assembly, scheduled delivery, comments, version history, or public anonymous sharing in this feature.

### Explicitly out of scope

- Dashboard creation, widget layout, global filters, per-widget overrides, and dashboard sharing.
- Visual query builder, AI-generated questions, semantic-layer modeling, comments, version history, scheduled reports, alerts, and asynchronous export jobs.
- Non-CSV export formats and public anonymous links.
- New data-connection management, ad hoc query engine policy, authentication, or tenancy foundations beyond consuming the existing platform capabilities.

## Clarifications

### Session 2026-06-01

- Q: What should happen when a user deletes a collection that still contains active saved questions? → A: Refuse deletion until all active questions are moved or deleted.
- Q: How should duplicate collection names be handled within the same workspace? → A: Reject duplicate collection names within a workspace.
- Q: What permission levels should collection and question grants support? → A: Grants support `view` and `edit`; export is a separate permission.
- Q: What parameter types should saved questions support in Feature 5? → A: Support scalar parameter types: string, number, boolean, date.
- Q: How should concurrent edits to questions or collections be handled? → A: Reject stale updates when the question or collection changed since loaded.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Author organizes and saves reusable questions (Priority: P1)

An internal author creates a flat collection, writes a reusable saved question with a title, description, query text, and declared parameters, then saves it to that collection so permitted workspace members can find and reuse it later.

**Why this priority**: Saved questions are the primary authoring artifact that turns governed query execution into reusable business content.

**Independent Test**: An authorized author can create a collection, save a question into it, see it in the collection-filtered list, open its detail view, update allowed fields, and soft-delete it without affecting unrelated collections or questions.

**Acceptance Scenarios**:

1. **Given** an internal author with permission to create content in a workspace, **When** they create a collection with a valid name, **Then** the collection appears in the workspace collection list and can contain saved questions.
2. **Given** an internal author and an accessible collection, **When** they save a question with title, description, query text, and declared parameters, **Then** the question is stored in that collection and is visible to members who have access to the collection.
3. **Given** an existing saved question owned or editable by an author, **When** the author updates title, description, query text, parameter declarations, or collection assignment to another permitted collection, **Then** subsequent detail views reflect the updated saved question and access follows the target collection plus any explicit question grants.
4. **Given** a saved question or collection no longer needed, **When** an authorized author deletes it, **Then** it no longer appears in normal lists while historical execution records remain attributable.

---

### User Story 2 - Permitted users discover and run saved questions (Priority: P2)

Permitted internal users browse collections and saved questions, open a saved question without needing direct access to connection details, provide declared parameter values, and run it through the governed execution path with clear outcomes and capped results.

**Why this priority**: Reuse only delivers value if non-author users can find trusted questions and run them safely without seeing sensitive implementation details.

**Independent Test**: A user with read access to a collection can list and open saved questions in that collection, execute a saved question with valid parameters, receive a bounded result or typed refusal, and cannot view or run questions outside their effective access.

**Acceptance Scenarios**:

1. **Given** a user has access to a collection, **When** they browse saved questions, **Then** the list includes accessible questions in that collection and excludes inaccessible questions in other collections.
2. **Given** a user opens an accessible saved question, **When** the detail view is shown, **Then** they can see business-facing metadata and parameter prompts but not secret connection material.
3. **Given** a saved question has required parameters, **When** a permitted user runs it with valid values, **Then** execution uses the existing governed query pathway, returns capped results with completion status, and records execution lineage.
4. **Given** a saved question may have a cached reusable result, **When** a permitted user chooses to force a fresh run, **Then** execution bypasses cached results and returns a newly evaluated governed outcome.
5. **Given** a user supplies missing, unknown, or invalid parameter values, **When** they attempt execution, **Then** the system refuses before warehouse work and explains which parameter requirement failed.

---

### User Story 3 - Author clones a question into a target collection (Priority: P3)

An internal author duplicates an existing saved question into a permitted target collection so they can adapt it without changing the source question or carrying over source-only permissions.

**Why this priority**: Cloning accelerates authoring while preserving clear ownership and preventing accidental permission leakage.

**Independent Test**: An analyst with read access to a source question and create access in a target collection can clone the question, sees themselves as the new owner, verifies the source remains unchanged, and verifies the clone's access follows the target collection.

**Acceptance Scenarios**:

1. **Given** an author can read a source question and create content in a target collection, **When** they clone the question, **Then** a new question is created with copied business content, a new owner, and placement in the target collection.
2. **Given** a cloned question, **When** permissions are evaluated, **Then** effective access is based on the target collection plus explicit grants added to the clone, not the source question's explicit grants.
3. **Given** an author lacks create access to the target collection, **When** they attempt to clone into it, **Then** cloning is refused and the source question remains unchanged.

---

### User Story 4 - Authorized users export saved question results as CSV (Priority: P4)

Users with export permission download the current result of a saved question as a CSV file, constrained by the same authorization, parameter validation, execution policy, and row cap used for on-screen execution.

**Why this priority**: Business users often need controlled offline analysis while the platform must avoid unbounded data extraction.

**Independent Test**: A permitted user exports an accessible saved question with valid parameters and receives a CSV with headers and no more than the allowed maximum rows; a user without export rights receives an authorization refusal.

**Acceptance Scenarios**:

1. **Given** an internal user has visible access to a saved question and their role allows CSV export, **When** they request CSV export with valid parameters, **Then** the system returns a CSV response containing column headers and no more than 10,000 rows.
2. **Given** an external client has read access but no export grant, **When** they request CSV export, **Then** export is refused without revealing question internals or connection metadata.
3. **Given** execution fails validation, times out, or exceeds policy limits, **When** export is requested, **Then** the CSV is not produced and the same governed outcome category is surfaced to the user.

---

### Edge Cases

- Duplicate collection names within the same workspace must be rejected while allowing the same collection name in different workspaces.
- A saved question cannot exist without exactly one collection; moving to a deleted or inaccessible collection is refused.
- Deleting a collection that still contains active saved questions must be refused with guidance to move or delete those questions first; silent orphaning and cascade deletion are not allowed.
- Collection and question lists must exclude soft-deleted items by default.
- A permission change after a user loads a list but before they execute, edit, clone, or export must be rechecked at action time.
- Concurrent edits to the same collection or saved question must reject stale updates when the item changed since the editor loaded it, preventing silent overwrite.
- Explicit question grants may widen `view` or `edit` access beyond the collection but cannot deny access inherited from the collection; export permission is evaluated separately.
- External clients can never receive query text, parameter internals beyond prompts needed to run, connection metadata, or collection administration controls.
- Required parameters with empty values, unsupported types outside `string`, `number`, `boolean`, and `date`, or unexpected parameter names must fail before governed execution begins.
- CSV export of zero result rows still produces headers when the saved question executes successfully.
- Large result sets are truncated to the export cap rather than streamed without bound.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support flat workspace collections with create, read, update, delete, list, ordering, and permission-filtered discovery behavior; collection names MUST be unique within a workspace.
- **FR-002**: The system MUST require each saved question to belong to exactly one collection in the same tenant and workspace.
- **FR-003**: The system MUST support saved question creation, reading, updating, deletion, and listing with title, optional description, query text, declared parameter schema, owner attribution, collection placement, and lifecycle timestamps; declared parameters MUST be limited to scalar `string`, `number`, `boolean`, and `date` types in this feature.
- **FR-004**: The system MUST enforce tenant and workspace boundaries for every collection and saved question action.
- **FR-005**: The system MUST restrict collection and saved question management actions to authorized internal roles and permissions; users without edit permission MUST NOT change collection or question content.
- **FR-006**: The system MUST compute saved question effective access as collection access plus explicit question-level grants, with grants supporting `view` and `edit` levels only; explicit grants may widen access and MUST never deny inherited access.
- **FR-007**: The system MUST prevent external clients from receiving query text, connection metadata, or collection administration capabilities even when they have read or execute access to a saved question.
- **FR-008**: The system MUST allow permitted users to execute saved questions through the existing governed execution pathway using the saved question identity, declared parameters, tenant context, and workspace context; execution UI MUST expose a force-fresh option that sends a cache-bypass request.
- **FR-009**: The system MUST validate runtime parameter values against the saved question's declared scalar parameter schema before execution or export begins.
- **FR-010**: The system MUST record saved question execution lineage through the existing execution audit model, including saved question attribution and categorical completion outcome.
- **FR-011**: The system MUST allow permitted users to clone a saved question into a target collection they can create content in, producing a distinct saved question owned by the cloner.
- **FR-012**: The system MUST ensure a cloned saved question receives permissions from the target collection and does not carry over explicit question grants from the source question.
- **FR-013**: The system MUST support synchronous CSV export for saved question results when an internal `admin`, `analyst`, or `viewer` has visible access to the saved question; external clients MUST have an explicit asset grant with export enabled.
- **FR-014**: CSV export MUST use the same saved question permission, parameter validation, governed execution, row limit, and audit behavior as on-screen execution.
- **FR-015**: CSV export MUST cap output at 10,000 rows, include column headers when execution succeeds, and refuse unbounded or asynchronous export behavior.
- **FR-016**: The system MUST soft-delete collections and saved questions where deletion is supported, excluding deleted items from normal lists while preserving historical references needed for audit and traceability; deleting a collection with active saved questions MUST be refused until those questions are moved or deleted.
- **FR-017**: The system MUST re-check permissions at action time for detail, update, delete, clone, execute, and export operations rather than relying only on a previously loaded list.
- **FR-018**: The system MUST reject stale updates to collections or saved questions when the target item has changed since the editor loaded it, and MUST avoid silently overwriting another user's changes.
- **FR-019**: The system MUST provide clear user-facing refusal categories for unauthorized access, invalid parameters, missing or deleted resources, stale updates, execution failure, and export not permitted.
- **FR-020**: The system MUST invalidate reusable cached results when a saved question's query text or parameter definition changes, and MUST bypass cached results when the user requests a force-fresh execution, so later runs reflect the current saved question definition.
- **FR-021**: The system MUST keep this feature limited to saved questions and collections, without introducing dashboards, dashboard widgets, nested folders, scheduled delivery, comments, version history, or public anonymous sharing.

### Key Entities *(include if feature involves data)*

- **Collection**: A flat workspace container for saved questions; has tenant and workspace ownership, a name unique within its workspace, slug or stable locator, display ordering, lifecycle timestamps, and deletion state.
- **Collection Access Grant**: Permission relationship that determines which workspace members can view or edit a collection and therefore inherit access to questions inside it; export is not implied by collection view or edit access.
- **Saved Question**: A reusable governed analytical question with tenant and workspace ownership, collection placement, title, description, query text, declared scalar parameters (`string`, `number`, `boolean`, `date`), owner attribution, lifecycle timestamps, and deletion state.
- **Question Grant**: Optional permission relationship that widens view or edit access to one saved question beyond the access inherited from its collection; export remains a separate permission.
- **Saved Question Execution**: A user-initiated run of a saved question with parameter values, governed outcome, capped results, and audit attribution.
- **CSV Export Request**: A synchronous request to download saved question results with internal role-based export permission or explicit external `can_export`, parameter validation, execution outcome, and row cap enforcement.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In role-based acceptance testing, 100% of users see only collections and saved questions they are permitted to access across at least admin, analyst, viewer, and external client roles.
- **SC-002**: Authorized internal authors can complete the primary loop of creating a collection, saving a question, running it with the normal or force-fresh action, and finding it again from the collection list in under 3 minutes during scripted usability testing.
- **SC-003**: 100% of clone tests prove the clone has a new identity and owner, source content remains unchanged, and effective permissions follow the target collection rather than the source question's explicit grants.
- **SC-004**: 100% of saved question execution and CSV export attempts in regression coverage produce permission-checked governed outcomes and execution audit attribution when an authenticated user and target question are known.
- **SC-005**: CSV export tests verify that no successful export exceeds 10,000 data rows, includes headers, and refuses external clients lacking explicit export permission.
- **SC-006**: Parameter validation tests cover required, optional, unknown, missing, and type-incompatible values across `string`, `number`, `boolean`, and `date` declarations with 100% refusal before execution for invalid submissions.
- **SC-007**: Soft-deleted collections and questions are absent from normal list views within one user refresh cycle in 100% of lifecycle tests.
- **SC-008**: Concurrent edit tests show 100% of stale collection and saved question updates are rejected without overwriting the newer saved state.

## Assumptions

- Authentication, tenant resolution, workspace membership roles, centralized permission checks, data connections, and governed query execution are already available from earlier features.
- Workspace collections are flat in this feature; nesting and folder hierarchy are intentionally deferred.
- Each saved question belongs to one collection at a time.
- Internal authoring roles can create and edit saved questions when granted access; viewers consume accessible saved questions read-only.
- Internal `admin`, `analyst`, and `viewer` roles may export visible saved-question results within CSV limits; external clients may consume only explicitly granted assets and may export only when an explicit export grant allows it.
- CSV is the only export format in this feature, and exports are immediate synchronous downloads rather than background jobs.
- Query text remains an authoring concern and is not shown to external clients.
- Historical audit references may retain deleted question identifiers or labels needed for traceability without restoring deleted content to normal browsing.
