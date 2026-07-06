"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { FilterValue, WidgetExecuteResponse } from "@dashboardy/types";

import { WidgetChrome } from "./widget-chrome";

type BarWidgetProps = {
  accessToken: string;
  workspaceId: string;
  dashboardId: string;
  widgetId: string;
  title?: string | null;
  filterBindings?: Record<string, string>;
  globalFilterValues?: Record<string, FilterValue>;
};

function chartData(data: WidgetExecuteResponse | null): Record<string, unknown>[] {
  if (!data || data.meta.status !== "ok") {
    return [];
  }
  const [xCol, yCol] = data.columns;
  if (!xCol || !yCol) {
    return [];
  }
  return data.rows.map((row) => ({
    x: row[0],
    y: Number(row[1]) || 0,
  }));
}

export function BarWidget({
  accessToken,
  workspaceId,
  dashboardId,
  widgetId,
  title,
  filterBindings,
  globalFilterValues,
}: BarWidgetProps) {
  return (
    <WidgetChrome
      accessToken={accessToken}
      workspaceId={workspaceId}
      dashboardId={dashboardId}
      widgetId={widgetId}
      filterBindings={filterBindings}
      globalFilterValues={globalFilterValues}
    >
      {({ loading, error, data }) => {
        const points = chartData(data);
        return (
          <div className="flex h-full min-h-[200px] flex-col gap-2 rounded-lg border border-border-1 bg-surface-1 p-4">
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
            ) : points.length === 0 ? (
              <p className="text-sm text-ink-muted">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={points}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="x" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar
                    dataKey="y"
                    fill="var(--color-accent, #6366f1)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        );
      }}
    </WidgetChrome>
  );
}
