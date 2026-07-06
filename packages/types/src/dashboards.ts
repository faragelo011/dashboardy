/**
 * Hand-aligned with
 * `specs/006-dashboard-builder/contracts/dashboards.openapi.yaml`
 * (Dashboardy Feature 6). Prefer importing from `@dashboardy/types` in web/API clients.
 *
 * Initial OpenAPI-aligned scaffold (T022). Final verification against the contract
 * is T080 in Phase 8.
 */

export type FilterValue = string | number | boolean;

export type GlobalFilterValueType = "string" | "number" | "boolean" | "date";

export type GlobalFilter = {
  id: string;
  label: string;
  value_type: GlobalFilterValueType;
  default_value: FilterValue;
};

export type WidgetLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DashboardDefinition = {
  layout_version: number;
  global_filters: GlobalFilter[];
};

export type DashboardWidget = {
  id: string;
  title?: string | null;
  widget_type: "kpi" | "bar" | "line" | "table";
  saved_question_id: string;
  layout: WidgetLayout;
  config: Record<string, unknown>;
  filter_bindings: Record<string, string>;
  filter_overrides: Record<string, FilterValue>;
  has_active_overrides: boolean;
  can_export: boolean;
};

export type DashboardWidgetConsumer = {
  id: string;
  title?: string | null;
  widget_type: "kpi" | "bar" | "line" | "table";
  layout: WidgetLayout;
  config: Record<string, unknown>;
  filter_bindings: Record<string, string>;
  filter_overrides: Record<string, FilterValue>;
  has_active_overrides: boolean;
  can_export: boolean;
};

export type DashboardWidgetCreateInput = {
  title?: string | null;
  widget_type: "kpi" | "bar" | "line" | "table";
  saved_question_id: string;
  layout: WidgetLayout;
  config: Record<string, unknown>;
  filter_bindings: Record<string, string>;
  filter_overrides: Record<string, FilterValue>;
};

export type DashboardWidgetUpdateInput = DashboardWidgetCreateInput & {
  id: string;
};

export type DashboardSummary = {
  id: string;
  collection_id: string;
  title: string;
  updated_at: string;
};

export type DashboardEditorDetail = {
  detail_level: "editor";
  id: string;
  collection_id: string;
  title: string;
  definition: DashboardDefinition;
  widgets: DashboardWidget[];
  updated_at: string;
  can_edit: boolean;
};

export type DashboardConsumerDetail = {
  detail_level: "consumer";
  id: string;
  collection_id: string;
  title: string;
  definition: DashboardDefinition;
  widgets: DashboardWidgetConsumer[];
  updated_at: string;
  can_edit: boolean;
};

export type DashboardDetail = DashboardEditorDetail | DashboardConsumerDetail;

export type DashboardListQuery = {
  collection_id?: string;
};

export type DashboardListResponse = {
  dashboards: DashboardSummary[];
};

export type DashboardCreateRequest = {
  collection_id: string;
  title: string;
  definition?: DashboardDefinition;
  widgets?: DashboardWidgetCreateInput[];
};

export type DashboardUpdateRequest = {
  updated_at: string;
  collection_id?: string;
  title?: string;
  definition?: DashboardDefinition;
  widgets?: DashboardWidgetUpdateInput[];
};

export type DashboardCloneRequest = {
  target_collection_id: string;
  title?: string;
};

export type WidgetExecuteRequest = {
  global_filter_values: Record<string, FilterValue>;
  bypass_cache?: boolean;
};

export type FilterStateExport = {
  global_filter_values: Record<string, FilterValue>;
};

/** URL-encoded JSON of FilterStateExport for CSV export query param. */
export type DashboardWidgetExportQuery = {
  filter_state: string;
  bypass_cache?: boolean;
};

export type ColumnDescriptor = {
  name: string;
  type?: string | null;
};

export type WidgetExecuteMeta = {
  status: string;
  duration_ms: number;
  row_count: number;
  truncated: boolean;
  cache_hit: boolean;
  error_code?: string | null;
};

export type WidgetExecuteResponse = {
  columns: ColumnDescriptor[];
  rows: unknown[][];
  meta: WidgetExecuteMeta;
};

export type DashboardsKnownErrorCode =
  | "duplicate_dashboard_title"
  | "dashboard_not_found"
  | "widget_not_found"
  | "stale_update"
  | "invalid_filter_bindings"
  | "widget_local_filter_forbidden"
  | "invalid_parameters"
  | "export_not_permitted"
  | "collection_not_empty"
  | "unsupported_widget_type";

declare const dashboardsNormalizedErrorCodeBrand: unique symbol;

/** Known contract codes plus forward-compatible API error codes. */
export type DashboardsNormalizedErrorCode =
  | DashboardsKnownErrorCode
  | (string & { readonly [dashboardsNormalizedErrorCodeBrand]?: never });

export type DashboardsNormalizedError = {
  error_code: DashboardsNormalizedErrorCode;
  message: string;
};
