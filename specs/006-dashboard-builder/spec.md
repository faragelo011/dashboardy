# Feature Specification: Dashboard Builder

**Feature Branch**: `006-dashboard-builder`  
**Created**: 2026-06-29  
**Status**: Draft  
**Input**: User description: "Create a specification for Feature 6 — Dashboard builder ONLY (from `docs/implementation-plan.md`)."

## Scope

### In scope

Dashboard authoring and consumption for one workspace, including flat-collection placement, widget assembly from existing saved questions, supported visual presentations (single-value KPI, bar chart, line chart, and table), dashboard-global filters with explicit per-widget parameter bindings, visible per-widget overrides of those global filters (no widget-local-only filters), permission-filtered discovery, governed widget execution with merged filter state, synchronous CSV export for table widgets, dashboard cloning into permitted collections, and safe read-only consumption for internal viewers and explicitly granted external clients.

Each dashboard belongs to exactly one collection and inherits collection access, with optional dashboard-level grants that widen access only using `view` or `edit` levels; export is not implied by dashboard view or edit access and requires a separate explicit grant. External clients may access only dashboards explicitly granted to them and must never receive underlying query text or connection details. Table widgets display server-capped result sets with client-side paging over the returned rows.

### Explicitly out of scope

- New saved question authoring, collection administration beyond choosing a target collection for dashboards, data connection management, ad hoc query execution policy, authentication, or tenancy foundations beyond consuming existing platform capabilities.
- Widget types beyond KPI, bar, line, and table (for example pie, area, scatter, funnel).
- Nested collections, dashboard comments, version history, scheduled delivery, alerts, embedded public anonymous links, and asynchronous export jobs.
- Visual query builder, AI-generated dashboards, semantic-layer modeling, and white-labeling.
- Widget-local-only filters that are not declared as dashboard-global filters.
- Server-side table pagination cursors or stateful paging beyond the governed row cap returned in one execution.

## Clarifications

### Session 2026-06-29

- Q: When a consumer changes a dashboard-global filter value, how should affected widgets update? → A: Auto-refresh all bound widgets immediately when a global filter value changes.
- Q: Should dashboards support widget-local-only filters (filters that exist on one widget and are not declared as dashboard-global filters)? → A: No — only dashboard-global filters plus visible per-widget overrides of those globals.
- Q: What permission levels should dashboard-level grants support? → A: `view` and `edit` only; export remains a separate explicit grant.
- Q: Should users be able to export table widget results to CSV from within a dashboard in this feature? → A: Yes — table widgets support synchronous CSV export with the same permission and 10,000-row cap as saved questions.
- Q: How should duplicate dashboard titles be handled within the same workspace? → A: Reject duplicate dashboard titles within the same collection only.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Analyst assembles a dashboard from saved questions (Priority: P1)

An internal analyst creates a dashboard in a permitted collection, arranges widgets on a layout grid, selects a saved question for each widget, and chooses a supported presentation type so stakeholders can view multiple governed metrics together.

**Why this priority**: Dashboard assembly is the core authoring outcome of this feature and turns reusable saved questions into consumable business views.

**Independent Test**: An authorized analyst can create a dashboard, add at least one widget backed by an accessible saved question, choose a supported widget type, save the layout, reopen the dashboard, and see widgets render governed results without exposing query text to non-author roles.

**Acceptance Scenarios**:

1. **Given** an analyst with permission to create content in a workspace collection, **When** they create a dashboard with a valid title in that collection, **Then** the dashboard appears in permission-filtered dashboard lists for users with access to that collection.
2. **Given** an existing dashboard editable by an analyst, **When** they add a widget by selecting an accessible saved question and a supported type (KPI, bar, line, or table), **Then** the widget is saved in the dashboard layout and can be repositioned or removed.
3. **Given** a dashboard with one or more widgets, **When** a permitted consumer opens it, **Then** each widget loads through the governed execution pathway and presents results appropriate to its type without revealing underlying query text or connection metadata to viewers or external clients.
4. **Given** an analyst updates dashboard title, collection placement, layout, or widget configuration, **When** they save changes, **Then** subsequent views reflect the updated dashboard while respecting current permissions on the target collection.
5. **Given** a dashboard no longer needed, **When** an authorized analyst deletes it, **Then** it no longer appears in normal lists while historical execution records remain attributable.

---

### User Story 2 - Dashboard-global filters drive widget results (Priority: P2)

An analyst configures dashboard-global filters mapped to saved-question parameters, and consumers change those filters to refresh affected widgets consistently across the dashboard.

**Why this priority**: Global filters are the primary interaction model for business consumers and must behave predictably across widgets.

**Independent Test**: An analyst defines at least one global filter with a default value and explicit widget bindings; a consumer changes the filter and sees only widgets that declared a binding update, with no cross-widget leakage from undeclared bindings.

**Acceptance Scenarios**:

1. **Given** a dashboard with global filters, **When** an analyst configures a filter with a default value and maps it to a bound parameter on selected widgets, **Then** only widgets with an explicit binding use that filter value during execution.
2. **Given** a widget does not declare a binding for a global filter, **When** a consumer changes that filter, **Then** the widget's results remain based on its own bindings and overrides only, not on silent inference from unrelated parameters.
3. **Given** a consumer changes a global filter value, **When** the change is applied, **Then** all widgets with an explicit binding to that filter auto-refresh immediately, refreshed results correspond to the new filter state, and do not reuse outcomes produced for a prior filter state.
4. **Given** filter default values are defined on the dashboard, **When** a consumer first opens the dashboard, **Then** defaults are applied from dashboard configuration rather than from the viewer's identity, role, or tenant attributes.
5. **Given** a consumer supplies an invalid or incomplete filter value, **When** widget execution is attempted, **Then** affected widgets refuse before warehouse work and explain which filter or parameter requirement failed.

---

### User Story 3 - Per-widget filter overrides remain visible (Priority: P3)

When a widget's analytical context differs from the rest of the dashboard, an analyst configures a per-widget override of a dashboard-global filter and consumers can see that the widget is not using the global filter value alone. Widget-local-only filters independent of dashboard-global filters are not supported.

**Why this priority**: Visible overrides prevent misleading comparisons and satisfy the platform rule that hidden filter divergence is forbidden.

**Independent Test**: An analyst sets a widget override for at least one global filter; consumers see a visible override indicator on that widget, and execution uses the override value instead of the current global value for that widget only.

**Acceptance Scenarios**:

1. **Given** a widget requires a different value than the current global filter, **When** an analyst configures a per-widget override, **Then** the override is stored with the widget and shown in the widget chrome to consumers.
2. **Given** a widget has an active override, **When** a consumer views the dashboard, **Then** the widget displays an indicator that its filter state differs from the global filter bar for the overridden filter(s).
3. **Given** both global filters and widget overrides are present, **When** the widget executes, **Then** the effective filter state merges global values with declared overrides and explicit bindings before governed execution begins.
4. **Given** an analyst removes a widget override, **When** the dashboard is saved and reopened, **Then** the widget returns to using the global filter value through its declared binding and the override indicator is no longer shown.

---

### User Story 4 - Permitted users consume dashboards safely (Priority: P4)

Internal viewers and explicitly granted external clients open dashboards they can access, interact with allowed filters, and view widget results without gaining authoring or data-connection capabilities.

**Why this priority**: Dashboards exist primarily for consumption; access boundaries and information hiding are non-negotiable product requirements.

**Independent Test**: Users across analyst, viewer, and external client roles see only permitted dashboards; viewers and external clients cannot edit layouts or clone dashboards; external clients never receive query text or connection metadata.

**Acceptance Scenarios**:

1. **Given** a viewer has access to a dashboard through collection or dashboard grants, **When** they open it, **Then** they can use global filters and view widget results but cannot edit layout, widgets, filters configuration, or clone the dashboard.
2. **Given** an external client has an explicit grant to a dashboard, **When** they open it, **Then** they see only that granted dashboard content and cannot browse unrelated workspace assets.
3. **Given** any non-author consumer role, **When** dashboard or widget data is returned, **Then** the response excludes underlying query text, connection metadata, and collection administration controls.
4. **Given** a user's access to a dashboard is revoked after they loaded a list, **When** they attempt to open, filter, or refresh it, **Then** access is refused at action time rather than relying on a stale list entry.
5. **Given** a table widget returns a governed capped result set, **When** a consumer pages through the table, **Then** paging occurs over the returned rows client-side without issuing unbounded additional warehouse requests for the same widget state.
6. **Given** a permitted user views a table widget with export rights, **When** they request CSV export using the current filter state, **Then** the system returns a synchronous CSV with column headers and no more than 10,000 rows using the same permission, parameter validation, and execution policy as saved question export.

---

### User Story 5 - Analyst clones a dashboard into a target collection (Priority: P5)

An analyst duplicates an existing dashboard into a permitted target collection to adapt a proven layout without altering the source dashboard or carrying over source-only permissions.

**Why this priority**: Cloning accelerates dashboard delivery while preserving clear ownership and preventing accidental permission leakage.

**Independent Test**: An analyst with read access to a source dashboard and create access in a target collection clones it, becomes owner of the clone, verifies the source remains unchanged, and verifies the clone's access follows the target collection.

**Acceptance Scenarios**:

1. **Given** an analyst can read a source dashboard and create content in a target collection, **When** they clone the dashboard, **Then** a new dashboard is created with copied layout, filters, and widget configuration, a new owner, and placement in the target collection.
2. **Given** a cloned dashboard, **When** permissions are evaluated, **Then** effective access is based on the target collection plus explicit grants on the clone, not the source dashboard's explicit grants.
3. **Given** an analyst lacks create access to the target collection, **When** they attempt to clone into it, **Then** cloning is refused and the source dashboard remains unchanged.
4. **Given** viewers or external clients, **When** they attempt to clone a dashboard they can view, **Then** cloning is refused regardless of visibility.

---

### Edge Cases

- A dashboard cannot exist without exactly one collection; moving to a deleted or inaccessible collection is refused.
- Duplicate dashboard titles within the same collection must be rejected while allowing the same title in different collections within a workspace.
- Deleting a collection that still contains active dashboards must be refused until those dashboards are moved or deleted first; silent orphaning and cascade deletion are not allowed.
- Dashboard and widget lists must exclude soft-deleted dashboards by default.
- Widgets may only reference saved questions the analyst can access at configuration time; execution must re-check access at run time.
- Unsupported widget types, missing saved question references, or saved questions whose parameters cannot satisfy declared filter bindings must be refused with clear guidance during authoring or execution.
- Widget-local-only filters independent of dashboard-global filters must be refused during authoring.
- Changing dashboard-global filter definitions, widget filter bindings, widget overrides, or underlying saved question parameter compatibility must invalidate reusable cached widget outcomes for affected widgets.
- Concurrent edits to the same dashboard must reject stale updates when the dashboard changed since the editor loaded it, preventing silent overwrite.
- Permission changes, filter changes, and explicit force-refresh requests must be honored at execution time rather than only at initial page load.
- Global filter changes must trigger immediate auto-refresh of all bound widgets; widgets without a binding to the changed filter must not execute spuriously.
- When warehouse execution is busy, times out, exceeds row limits, or fails validation, affected widgets surface typed refusal states without breaking unrelated widgets on the same dashboard.
- Explicit dashboard grants may widen `view` or `edit` access beyond the collection but cannot deny access inherited from the collection; export permission is evaluated separately.
- External clients without explicit export grants must not receive CSV or bulk export affordances from dashboard widgets even when they can view the dashboard.
- Table widget CSV export of zero result rows still produces headers when execution succeeds; export must not exceed the 10,000-row cap.
- Global filter defaults must not embed personally identifying viewer context; analysts supply business-safe defaults only.
- Table widgets must not imply that additional pages fetch unlimited new warehouse rows beyond the governed cap for the current widget execution.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support dashboard create, read, update, delete, list, and permission-filtered discovery within a workspace; dashboard titles MUST be unique within a collection and MAY repeat across different collections in the same workspace.
- **FR-002**: The system MUST require each dashboard to belong to exactly one flat collection in the same tenant and workspace.
- **FR-003**: The system MUST support dashboard metadata and definition including title, collection placement, layout, dashboard-global filters, widget list, owner attribution, lifecycle timestamps, and soft deletion.
- **FR-004**: The system MUST support widget configuration on a dashboard using supported types KPI, bar, line, and table only.
- **FR-005**: Each widget MUST reference exactly one saved question accessible under current permissions and MUST store presentation configuration, layout position, filter bindings, and optional per-widget filter overrides.
- **FR-006**: The system MUST enforce tenant and workspace boundaries for every dashboard and widget action.
- **FR-007**: The system MUST restrict dashboard and widget authoring actions to authorized internal roles and permissions; users without edit permission MUST NOT change dashboard structure, widgets, or filter configuration.
- **FR-008**: The system MUST compute dashboard effective access as collection access plus explicit dashboard-level grants supporting `view` and `edit` levels only; explicit grants may widen access and MUST never deny inherited access; export permission is evaluated separately and is not implied by `view` or `edit` dashboard grants.
- **FR-009**: The system MUST require external client access to dashboards to be expressed only through explicit per-dashboard asset grants, not through collection inheritance alone.
- **FR-010**: The system MUST prevent external clients and other non-author consumers from receiving underlying query text, connection metadata, or collection administration capabilities when viewing or refreshing dashboards.
- **FR-011**: The system MUST support dashboard-global filters declared once per dashboard, each mapped to a bound parameter on underlying saved questions through explicit per-widget parameter bindings.
- **FR-012**: A widget that does not declare a binding for a global filter MUST ignore that global filter during execution; silent cross-binding is forbidden.
- **FR-013**: The system MUST support per-widget filter overrides that replace global filter values for that widget only when explicitly configured; overrides MUST reference an existing dashboard-global filter and MUST NOT introduce widget-local-only filters.
- **FR-014**: Per-widget filter overrides MUST be visible in the widget user interface whenever active; hidden overrides are forbidden.
- **FR-015**: Global filter default values MUST be stored in the dashboard definition and MUST NOT be derived from the viewing user's identity, tenant, or role.
- **FR-016**: The system MUST merge dashboard-global filter values, declared widget bindings, and per-widget overrides into an effective parameter set before governed widget execution begins.
- **FR-017**: The system MUST execute widgets through the existing governed execution pathway with dashboard and widget attribution, declared parameters, tenant context, workspace context, and categorical completion outcomes.
- **FR-018**: When a consumer changes a dashboard-global filter value, the system MUST auto-refresh all widgets with an explicit binding to that filter immediately. Widget outcomes after any filter, binding, or override change MUST correspond to the new effective state and MUST NOT reuse cached outcomes from a different filter state.
- **FR-019**: The system MUST allow permitted consumers to refresh individual widgets or the dashboard using current filter state, including an explicit force-fresh option that bypasses reusable cached widget outcomes when requested.
- **FR-020**: Table widgets MUST present results from a single governed execution capped by platform row limits, MUST paginate only client-side over the returned rows for the current widget state, and MUST support synchronous CSV export for permitted users using the current merged filter state with the same authorization rules, parameter validation, governed execution, 10,000-row cap, and audit behavior as saved question export; KPI, bar, and line widgets MUST NOT offer CSV export.
- **FR-021**: The system MUST allow permitted analysts to clone a dashboard into a target collection they can create content in, producing a distinct dashboard owned by the cloner.
- **FR-022**: A cloned dashboard MUST receive permissions from the target collection and MUST NOT carry over explicit dashboard grants from the source dashboard.
- **FR-023**: Viewers MAY consume dashboards and use filters but MUST NOT edit dashboards, configure widgets, or clone dashboards.
- **FR-024**: External clients MAY view only explicitly granted dashboards, MUST NOT author or clone dashboards, and MUST NOT export widget results unless an explicit export grant allows it.
- **FR-025**: The system MUST re-check permissions at action time for detail, update, delete, clone, filter, refresh, and widget execution operations rather than relying only on a previously loaded list.
- **FR-026**: The system MUST reject stale updates to dashboards when the target dashboard changed since the editor loaded it, and MUST avoid silently overwriting another user's changes.
- **FR-027**: The system MUST record widget and dashboard execution lineage through the existing execution audit model, including dashboard and widget attribution and categorical completion outcome.
- **FR-028**: The system MUST provide clear user-facing refusal categories for unauthorized access, invalid filters or parameters, missing or deleted resources, stale updates, execution failure, queue saturation, and export not permitted.
- **FR-029**: Authors MAY configure widgets to prefer fresher data within platform-defined minimum refresh intervals; increasing staleness beyond platform limits is not permitted.
- **FR-030**: The system MUST keep this feature limited to dashboard authoring and consumption, without introducing new saved question authoring flows, unsupported widget types, nested collections, scheduled delivery, comments, version history, or public anonymous sharing; CSV export is limited to table widgets only.

### Key Entities *(include if feature involves data)*

- **Dashboard**: A workspace analytical canvas with tenant and workspace ownership, collection placement, a title unique within its collection, layout, global filter definitions, widget collection, owner attribution, lifecycle timestamps, and deletion state.
- **Dashboard Widget**: A positioned visual on a dashboard with a supported type (KPI, bar, line, table), linked saved question, presentation settings, explicit global-filter bindings, optional visible filter overrides, and optional freshness preference within platform bounds.
- **Dashboard Global Filter**: A dashboard-level control with identifier, bound-parameter mapping target, and analyst-defined default value used to drive compatible widgets through explicit bindings.
- **Widget Filter Binding**: A declared relationship mapping a dashboard global filter to a specific saved-question parameter for one widget; absence of a binding means the widget ignores that global filter.
- **Widget Filter Override**: A widget-level value that supersedes the current global filter for that widget only, must reference a declared dashboard-global filter, must be visible to consumers when active, and must not act as an independent widget-local-only filter.
- **Dashboard Access Grant**: Optional permission relationship that widens `view` or `edit` access to one dashboard beyond access inherited from its collection; export is not implied by dashboard view or edit grants.
- **Dashboard Widget Execution**: A governed run of one widget using merged filter state, saved question identity, dashboard and widget attribution, capped results, and audit lineage.
- **Table Widget CSV Export**: A synchronous request to download a table widget's current result set with internal role-based export permission or explicit external `can_export`, current merged filter state, parameter validation, execution outcome, and 10,000-row cap enforcement.
- **Dashboard Clone**: A duplication of dashboard layout, filters, and widget configuration into a new dashboard with new ownership and target-collection permissions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In role-based acceptance testing, 100% of users see only dashboards they are permitted to access across at least admin, analyst, viewer, and external client roles.
- **SC-002**: Authorized analysts can complete the primary loop of creating a dashboard, adding a widget from a saved question, saving layout, and reopening it in under 5 minutes during scripted usability testing.
- **SC-003**: 100% of filter interaction tests prove that widgets without explicit bindings ignore unrelated global filters and that affected widgets refresh to outcomes matching the active filter state without reusing prior-state results.
- **SC-004**: 100% of widget override tests show visible override indicators to consumers and execution outcomes that reflect override values rather than the current global values for overridden widgets only.
- **SC-005**: 100% of external client consumption tests verify that granted users can view permitted dashboards while never receiving underlying query text or connection metadata in dashboard or widget responses.
- **SC-006**: 100% of clone tests prove the clone has a new identity and owner, source content remains unchanged, and effective permissions follow the target collection rather than the source dashboard's explicit grants.
- **SC-007**: In timed acceptance testing on a standard internal network, dashboard shell first render completes in under 2 seconds and a standard dashboard with up to six widgets reaches an interactive state within 5 seconds when underlying queries complete within normal limits.
- **SC-008**: 100% of dashboard and widget execution attempts in regression coverage produce permission-checked governed outcomes and execution audit attribution when an authenticated user and target widget are known.
- **SC-009**: Table widget tests verify client-side paging over a single governed result set and confirm that paging does not trigger unbounded additional warehouse executions for unchanged widget filter state.
- **SC-010**: Concurrent edit tests show 100% of stale dashboard updates are rejected without overwriting the newer saved state.
- **SC-011**: Table widget CSV export tests verify that no successful export exceeds 10,000 data rows, includes headers, uses current filter state, and refuses external clients lacking explicit export permission.
- **SC-012**: Dashboard title uniqueness tests verify 100% rejection of duplicate titles within the same collection and 100% acceptance of the same title in different collections within one workspace.

## Assumptions

- Authentication, tenant resolution, workspace membership roles, centralized permission checks, data connections, governed query execution, saved questions, and flat collections are already available from earlier features.
- Dashboard titles are unique within a collection only.
- `dashboard_grants` rows widen internal access (`view` or `edit` only) but have **no public CRUD API in Feature 6**; tests seed grants via repository helpers or SQL fixtures (same pattern as Feature 5 `question_grants`).
- Supported widget presentations in this feature are KPI, bar, line, and table only.
- Widgets are powered exclusively by existing saved questions; this feature does not introduce new query authoring surfaces.
- Internal analysts and admins may author dashboards when granted access; viewers consume accessible dashboards read-only; external clients consume only explicitly granted dashboards.
- Filter values always map to bound parameters on underlying saved questions through dashboard-global filters and per-widget overrides only; widget-local-only filters and filters that cannot be expressed as bound parameters are not supported.
- Platform row limits, execution timeouts, queue saturation handling, and audit retention rules from earlier features apply unchanged to dashboard widget execution.
- Reusable widget result caching may be used when permitted by platform policy, must be bypassed on explicit force-refresh, and must respect filter-state correctness requirements defined in this feature.
- CSV export from dashboards is limited to table widgets, is synchronous, and follows the same export permission model and 10,000-row cap as saved questions.
- Soft-deleted dashboards are hidden from normal browsing while historical execution records may retain dashboard and widget identifiers for traceability.
