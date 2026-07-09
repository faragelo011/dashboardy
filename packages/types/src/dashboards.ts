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

export type ChartVizSortKey = "x" | "first_y" | "column";

export type ChartVizSortOrder = "asc" | "desc";

export type ChartVizSortConfig = {
  /** Sort by the x-axis column. */
  key?: ChartVizSortKey;
  /** When `key === "column"`, the column name to sort by. */
  column?: string;
  order?: ChartVizSortOrder;
};

export type ChartVizNullHandlingConfig = {
  /** Coerce null/undefined Y values to 0, or skip them entirely. */
  mode?: "zero" | "skip";
};

export type ChartVizLegendConfig = {
  enabled?: boolean;
};

export type ChartVizFormatConfig = {
  x?: {
    kind?: "date" | "string";
  };
  y?: {
    maximumFractionDigits?: number;
  };
};

export type ChartPivotConfig = {
  /** When present, reshaping will pivot the long table into a wide table. */
  enabled?: boolean;
  /** Column holding the pivot “category” values (one column becomes multiple series). */
  pivotKey?: string;
  /** Column holding the pivot values, which are placed into the generated series columns. */
  pivotValue?: string;
};

export type ChartCalculatedFieldExpression =
  | {
      kind: "add" | "sub" | "mul" | "div";
      left: string;
      right: string;
    }
  | {
      kind: "coalesce";
      args: string[];
    }
  | {
      kind: "concat";
      args: string[];
      separator?: string;
    };

export type ChartCalculatedField = {
  /**
   * Identifier for the calculated field.
   * Used as a “virtual column name” inside the reshaping pipeline.
   */
  id: string;
  label?: string;
  expression: ChartCalculatedFieldExpression;
};

export type ChartVizConfig = {
  /**
   * X-axis column name (from query `columns[].name`).
   * If omitted, the first result column is used.
   */
  xKey?: string;
  /**
   * One or more Y-axis metric column names (from query `columns[].name`).
   * If omitted, the second result column is used.
   */
  yKeys?: string[];
  /**
   * Optional breakout column. When provided, the unique values in this column
   * generate multiple series.
   */
  seriesKey?: string;

  sort?: ChartVizSortConfig;
  limit?: number;
  nullHandling?: ChartVizNullHandlingConfig;
  legend?: ChartVizLegendConfig;
  format?: ChartVizFormatConfig;

  /** Optional “long → wide” reshaping. */
  pivot?: ChartPivotConfig;
  /** Optional virtual columns computed from the returned dataset. */
  calculatedFields?: ChartCalculatedField[];
  /** Optional per-widget cache TTL override (seconds). */
  ttl_seconds?: number;
};

/** Widget JSON config. Chart fields apply to bar/line; other widget types may use `{}`. */
export type WidgetConfig = ChartVizConfig;

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
  config: WidgetConfig;
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
  config: WidgetConfig;
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
  config: WidgetConfig;
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
  | "export_execution_refused"
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
