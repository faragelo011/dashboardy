/**
 * Hand-aligned with
 * `specs/006-dashboard-builder/contracts/dashboards.openapi.yaml`
 * (Dashboardy Feature 6). Prefer importing from `@dashboardy/types` in web/API clients.
 *
 * Placeholder scaffold — full types land in Phase 2 (T022).
 */

/** @placeholder Populated in Phase 2. */
export type GlobalFilter = {
  id: string;
};

/** @placeholder Populated in Phase 2. */
export type DashboardWidget = {
  id: string;
};

/** @placeholder Populated in Phase 2. */
export type DashboardSummary = {
  id: string;
};

/** @placeholder Populated in Phase 2. */
export type DashboardDetail = {
  id: string;
};

/** @placeholder Populated in Phase 2. */
export type WidgetExecuteResponse = {
  widget_id: string;
};

/** URL-encoded JSON of FilterStateExport for CSV export query param. */
export type DashboardWidgetExportQuery = {
  filter_state: string;
  bypass_cache?: boolean;
};
