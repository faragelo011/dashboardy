# Research: Dashboard Builder

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Decision: Use a dedicated `dashboards` backend domain

**Rationale**: Dashboards own collection placement, layout metadata, global filter definitions, widget CRUD, filter merge/hash, clone, widget execute orchestration, and table CSV export. A dedicated domain mirrors Feature 5's `questions` package while delegating warehouse execution to Feature 4 and permission primitives to `tenancy`.

**Alternatives considered**:

- Embed dashboard routes in `questions`: rejected because dashboards are a distinct asset type with widgets, filters, and layout concerns.
- Put dashboard persistence only in JSON without `dashboard_widgets`: rejected because widget execute/export endpoints need stable widget IDs for audit, cache keys, and permissions at action time.

## Decision: Hybrid persistence — `dashboards.definition` JSONB + normalized `dashboard_widgets`

**Rationale**: Store dashboard-global filters and coarse layout metadata in `dashboards.definition` for atomic authoring updates, while persisting each widget in `dashboard_widgets` with typed columns for `widget_type`, `saved_question_id`, `layout`, `config`, `filter_bindings`, and `filter_overrides`. This matches the implementation plan's optional normalization, supports per-widget execute/export routes, and keeps filter binding validation close to widget rows.

**Alternatives considered**:

- Single JSON blob for entire dashboard: rejected because widget-level execute, export, and audit attribution need addressable widget IDs without rewriting the whole document per refresh.
- Fully normalized global filters table: deferred — MVP filter count is small and filters are edited with the dashboard definition.

## Decision: Add `dashboard_grants` for internal widen-only access

**Rationale**: Feature 5 established `question_grants` for per-asset internal widens. Dashboards need the same `view`/`edit` vocabulary clarified in the spec. External clients continue to use existing `asset_grants` with `asset_type=dashboard`.

**Alternatives considered**:

- Reuse `question_grants`: rejected — wrong asset type and blurs permission evaluation.
- Store grants in dashboard JSON: rejected — not indexable or centrally enforceable.

## Decision: Merge filters server-side and compute `filter_state_hash` in `dashboards.filters`

**Rationale**: Constitution §7.7 requires explicit bindings, visible overrides, and cache keys that vary with filter state. Centralizing merge logic in the API ensures consistent execution, export, and cache identity whether the client calls widget execute directly or via a thin orchestration endpoint. Hash input includes global filter values, per-widget bindings, and active overrides for the widget.

**Alternatives considered**:

- Client sends final parameters only: rejected because server must validate bindings/overrides and enforce permission re-checks at execution time.
- Recompute hash only in query engine: rejected because dashboard domain owns binding semantics and should pass a validated parameter map downstream.

## Decision: Execute widgets through Feature 4 `widget` mode

**Rationale**: Feature 4 already defines `WidgetQueryExecuteRequest` with `dashboard_id`, `widget_id`, `saved_question_id`, `presentation_class`, `filter_state_hash`, cache TTL by widget type, and audit fields. Feature 6 should resolve dashboard/widget authorization, merge filters, map widget type to `PresentationClass`, then call the shared execution service.

**Alternatives considered**:

- New dashboard-only execution pipeline: rejected — duplicates parser, queue, cache, and audit behavior.
- Reuse `saved_question` mode without widget scope: rejected — breaks widget-level cache identity and audit attribution.

## Decision: Auto-refresh bound widgets on global filter change (client orchestration)

**Rationale**: Clarified spec requires immediate auto-refresh of all widgets bound to a changed global filter. The web viewer/builder keeps global filter state in Zustand or component state and issues parallel TanStack Query mutations/refetches to per-widget execute endpoints when a filter value changes. Widgets without bindings do not execute.

**Alternatives considered**:

- Single `POST /dashboards/{id}/execute` batch endpoint only: rejected as sole interface because partial failures, per-widget loading states, and retry are simpler with per-widget calls; a batch helper may be added later.
- Server-push refresh via websockets: rejected — out of MVP scope and unnecessary for ≤6 widget dashboards.

## Decision: No widget-local-only filters in MVP

**Rationale**: Clarified spec limits filters to dashboard-global filters plus visible overrides of those globals. This reduces builder UX complexity and keeps filter bar semantics consistent for consumers.

**Alternatives considered**:

- Support widget-local filters per constitution wording: rejected because clarification explicitly chose global + override only for this feature.

## Decision: Dashboard titles unique within collection

**Rationale**: Matches clarified spec and parallels collection-name uniqueness within workspace while allowing the same dashboard title in different collections.

**Alternatives considered**:

- Workspace-wide unique titles: rejected per clarification.

## Decision: Table widget CSV export reuses questions export pattern

**Rationale**: Clarified spec requires synchronous CSV for table widgets with the same permission model and 10,000-row cap as saved questions. Implement `dashboards/csv_export.py` parallel to `questions/csv_export.py`, using merged widget filter state and widget execute authorization.

**Alternatives considered**:

- Export via saved-question endpoint only: rejected because export must respect current dashboard filter state and widget binding context.
- CSV for all widget types: rejected per clarification.

## Decision: Frontend grid with CSS grid or `react-grid-layout` and Recharts for charts

**Rationale**: Implementation plan locks Recharts for charts. A responsive grid layout library (or controlled CSS grid with persisted `x/y/w/h`) supports builder drag/resize while storing layout in `dashboard_widgets.layout` JSON. KPI uses scalar result rendering; table uses existing results-table patterns with client-side pagination.

**Alternatives considered**:

- Free-form absolute positioning without persisted grid slots: rejected because resize/reflow and consistent viewer layout are harder to test.
- Additional chart library: rejected — constitution stack locks Recharts.

## Decision: Refuse collection delete while active dashboards remain

**Rationale**: Aligns with Feature 5 non-empty collection delete refusal and spec edge cases.

**Alternatives considered**:

- Cascade soft-delete dashboards: rejected due to accidental broad deletion risk.

## Decision: Reject stale dashboard updates

**Rationale**: Same concurrency posture as Feature 5 collections/questions; dashboard builder can be open in multiple sessions.

**Alternatives considered**:

- Last-write-wins: rejected because layout/filter changes can be lost silently.
