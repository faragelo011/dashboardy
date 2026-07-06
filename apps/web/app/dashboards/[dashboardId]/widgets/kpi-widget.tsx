"use client";

import type { FilterValue, WidgetExecuteResponse } from "@dashboardy/types";

import { WidgetChrome } from "./widget-chrome";

type KpiWidgetProps = {
  accessToken: string;
  workspaceId: string;
  dashboardId: string;
  widgetId: string;
  title?: string | null;
  filterBindings?: Record<string, string>;
  globalFilterValues?: Record<string, FilterValue>;
  hasActiveOverrides?: boolean;
};

function scalarFromResult(data: WidgetExecuteResponse | null): string | null {
  if (!data || data.meta.status !== "ok" || data.rows.length === 0) {
    return null;
  }
  const cell = data.rows[0]?.[0];
  if (cell === null || cell === undefined) {
    return null;
  }
  return String(cell);
}

export function KpiWidget({
  accessToken,
  workspaceId,
  dashboardId,
  widgetId,
  title,
  filterBindings,
  globalFilterValues,
  hasActiveOverrides,
}: KpiWidgetProps) {
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
      {({ loading, error, data }) => {
        const value = scalarFromResult(data);
        return (
          <div className="flex h-full flex-col gap-2 rounded-lg border border-border-1 bg-surface-1 p-4">
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
            ) : value === null ? (
              <p className="text-sm text-ink-muted">No data</p>
            ) : (
              <p className="text-3xl font-semibold tabular-nums text-ink-strong">
                {value}
              </p>
            )}
          </div>
        );
      }}
    </WidgetChrome>
  );
}
