"use client";

import type { ReactNode } from "react";

import type { FilterValue, WidgetExecuteResponse } from "@dashboardy/types";

import { useWidgetExecute } from "./use-widget-execute";

type WidgetChromeProps = {
  accessToken: string;
  workspaceId: string;
  dashboardId: string;
  widgetId: string;
  filterBindings?: Record<string, string>;
  globalFilterValues?: Record<string, FilterValue>;
  children: (ctx: {
    loading: boolean;
    error: string | null;
    data: WidgetExecuteResponse | null;
  }) => ReactNode;
};

export function WidgetChrome({
  accessToken,
  workspaceId,
  dashboardId,
  widgetId,
  filterBindings = {},
  globalFilterValues = {},
  children,
}: WidgetChromeProps) {
  const { loading, error, data, refresh, forceFresh } = useWidgetExecute({
    accessToken,
    workspaceId,
    dashboardId,
    widgetId,
    filterBindings,
    globalFilterValues,
  });

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2 text-[10px] uppercase tracking-wide text-ink-muted">
        <button
          type="button"
          className="rounded border border-border-2 px-2 py-1 hover:bg-surface-2"
          onClick={() => void refresh()}
          disabled={loading}
        >
          Refresh
        </button>
        <button
          type="button"
          className="rounded border border-border-2 px-2 py-1 hover:bg-surface-2"
          onClick={() => void forceFresh()}
          disabled={loading}
        >
          Force fresh
        </button>
        {data ? (
          <span>{data.meta.cache_hit ? "Cache hit" : "Cache miss"}</span>
        ) : null}
      </div>
      {children({ loading, error, data })}
    </div>
  );
}
