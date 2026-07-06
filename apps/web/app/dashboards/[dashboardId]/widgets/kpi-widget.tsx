"use client";

import type { WidgetExecuteResponse } from "@dashboardy/types";

import { useWidgetExecute } from "./use-widget-execute";

type KpiWidgetProps = {
  accessToken: string;
  workspaceId: string;
  dashboardId: string;
  widgetId: string;
  title?: string | null;
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
}: KpiWidgetProps) {
  const { loading, error, data } = useWidgetExecute(
    accessToken,
    workspaceId,
    dashboardId,
    widgetId,
  );
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
        <p className="text-3xl font-semibold tabular-nums text-ink-strong">{value}</p>
      )}
    </div>
  );
}
