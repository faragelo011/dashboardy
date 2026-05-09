/**
 * Hand-aligned with `specs/004-query-engine/contracts/query-execute.openapi.yaml`.
 * Prefer importing from `@dashboardy/types` in web/api clients.
 */

export type ExecutionStatus =
  | "ok"
  | "timeout"
  | "row_limit_exceeded"
  | "rejected_by_parser"
  | "warehouse_error"
  | "authz_denied"
  | "warehouse_busy";

export type PresentationClass = "kpi" | "chart" | "table";

export type QueryMode = "adhoc" | "saved_question" | "widget";

export type ColumnDescriptor = {
  name: string;
  type?: string | null;
};

export type QueryExecuteMeta = {
  status: ExecutionStatus;
  duration_ms: number;
  row_count: number;
  truncated: boolean;
  cache_hit: boolean;
  error_code?: string | null;
};

/** HTTP 200 success envelope from POST .../query/execute */
export type QueryExecuteSuccessResponse = {
  columns: ColumnDescriptor[];
  rows: unknown[][];
  meta: QueryExecuteMeta;
};

export type AdhocQueryExecuteRequest = {
  mode: "adhoc";
  sql_text: string;
  parameters?: Record<string, unknown>;
  bypass_cache?: boolean;
};
