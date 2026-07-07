import * as React from "react";

export interface DataTableColumn<Row = any> {
  /** Row property key (also the React key for the column). */
  key: string;
  /** Column header label. */
  header: React.ReactNode;
  /** Text alignment. @default "left" */
  align?: "left" | "center" | "right";
  /** Render the cell in the monospace stack (IDs, timestamps). */
  mono?: boolean;
  /** Fixed column width (CSS length). */
  width?: string;
  /** Custom cell renderer; defaults to `row[key]`. Empty values show "—". */
  render?: (row: Row, index: number) => React.ReactNode;
}

/**
 * DataTable — columnar data with optional client-side pagination over a
 * server-capped result set. Used for the member roster, asset grants, saved-
 * question results, and table widgets.
 *
 * @startingPoint section="Data" subtitle="Table with client-side pagination" viewport="760x360"
 */
export interface DataTableProps<Row = any> extends React.HTMLAttributes<HTMLDivElement> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  /** Enable client-side paging at this page size (e.g. 10). Omit for no paging. */
  pageSize?: number;
  /** Message shown when there are no rows. @default "No rows returned." */
  emptyMessage?: React.ReactNode;
  /** Stable row key selector. */
  getRowKey?: (row: Row, index: number) => React.Key;
}

export function DataTable<Row = any>(props: DataTableProps<Row>): JSX.Element;
