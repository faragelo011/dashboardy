"use client";

import type { WidgetExecuteResponse } from "@dashboardy/types";

import { WidgetChrome, type WidgetChromeProps } from "./widget-chrome";

type KpiWidgetProps = Omit<WidgetChromeProps, "children">;

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
  title,
  ...chromeProps
}: KpiWidgetProps & { title?: string | null }) {
  return (
    <WidgetChrome {...chromeProps}>
      {({ loading, error, data }) => {
        const value = scalarFromResult(data);
        return (
          <div className="flex h-full flex-col gap-2 rounded-ds-lg border border-border-1 bg-surface-0 p-4">
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
              <p className="font-display text-3xl font-medium tabular-nums tracking-tight text-ink-strong">
                {value}
              </p>
            )}
          </div>
        );
      }}
    </WidgetChrome>
  );
}
