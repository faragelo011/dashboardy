"use client";

import { useState, type HTMLAttributes, type ReactNode } from "react";

import { Button } from "./button";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  align?: "left" | "center" | "right";
  width?: string | number;
  mono?: boolean;
  render?: (row: T, index: number) => ReactNode;
};

export type DataTableProps<T> = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  columns: DataTableColumn<T>[];
  rows: T[];
  pageSize?: number;
  emptyMessage?: string;
  getRowKey?: (row: T, index: number) => string | number;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  pageSize,
  emptyMessage = "No rows returned.",
  getRowKey,
  className = "",
  ...rest
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const paginated = typeof pageSize === "number" && pageSize > 0;
  const total = rows.length;
  const pageCount = paginated ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const current = Math.min(page, pageCount - 1);
  const start = paginated ? current * pageSize : 0;
  const view = paginated ? rows.slice(start, start + pageSize) : rows;

  const alignClass = (a?: "left" | "center" | "right") =>
    a === "right" ? " dby-table__cell--right" : a === "center" ? " dby-table__cell--center" : "";

  return (
    <div className={["dby-table-shell", className].filter(Boolean).join(" ")} {...rest}>
      <div className="dby-table-wrap">
        <table className="dby-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={{ textAlign: c.align || "left", width: c.width }}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.length === 0 ? (
              <tr>
                <td className="dby-table__empty" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              view.map((row, i) => (
                <tr key={getRowKey ? getRowKey(row, start + i) : start + i}>
                  {columns.map((c) => {
                    const raw = c.render ? c.render(row, start + i) : row[c.key];
                    const content = raw as ReactNode;
                    return (
                      <td
                        key={c.key}
                        className={(c.mono ? "dby-table__mono" : "") + alignClass(c.align)}
                        style={{ textAlign: c.align || "left" }}
                      >
                        {content === null || content === undefined || content === ""
                          ? "—"
                          : content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {paginated && total > pageSize! ? (
        <div className="dby-table__pager">
          <span className="dby-table__range">
            {start + 1}–{Math.min(start + pageSize!, total)} of {total}
          </span>
          <div className="dby-table__pager-btns">
            <Button
              variant="secondary"
              size="sm"
              disabled={current === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={current >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
