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

import type { WidgetExecuteResponse } from "@dashboardy/types";

import { WidgetChrome, type WidgetChromeProps } from "./widget-chrome";

type BarWidgetProps = Omit<WidgetChromeProps, "children">;

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
  title,
  ...chromeProps
}: BarWidgetProps & { title?: string | null }) {
  return (
    <WidgetChrome {...chromeProps}>
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
