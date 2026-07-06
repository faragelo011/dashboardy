"use client";

import type { FilterValue } from "@dashboardy/types";

import { WidgetChrome } from "./widget-chrome";

type TableWidgetProps = {
  accessToken: string;
  workspaceId: string;
  dashboardId: string;
  widgetId: string;
  title?: string | null;
  filterBindings?: Record<string, string>;
  globalFilterValues?: Record<string, FilterValue>;
  hasActiveOverrides?: boolean;
};

export function TableWidget({
  accessToken,
  workspaceId,
  dashboardId,
  widgetId,
  title,
  filterBindings,
  globalFilterValues,
  hasActiveOverrides,
}: TableWidgetProps) {
  return (
    <WidgetChrome
      accessToken={accessToken}
      workspaceId={workspaceId}
      dashboardId={dashboardId}
      widgetId={widgetId}
      filterBindings={filterBindings}
      globalFilterValues={globalFilterValues}
      hasActiveOverrides={hasActiveOverrides}
    >
      {({ loading, error, data }) => (
        <div className="flex h-full flex-col gap-2 overflow-hidden rounded-lg border border-border-1 bg-surface-1 p-4">
          {title ? (
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {title}
            </p>
          ) : null}
          {loading ? (
            <p className="text-sm text-ink-muted">Loading…</p>
          ) : error ? (
            <p className="text-sm text-danger-ink" role="alert">
              {error}
            </p>
          ) : !data || data.meta.status !== "ok" ? (
            <p className="text-sm text-ink-muted">No data</p>
          ) : data.rows.length === 0 ? (
            <p className="text-sm text-ink-muted">Empty result</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full min-w-[240px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border-1">
                    {data.columns.map((col) => (
                      <th
                        key={col.name}
                        className="px-2 py-1.5 text-xs font-medium text-ink-muted"
                      >
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-border-1/60">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-2 py-1.5 text-ink">
                          {cell === null || cell === undefined ? "—" : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </WidgetChrome>
  );
}
