"use client";

import { RefreshCw, Zap } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ds/button";
import { DsIcon } from "@/components/ds/icon";

import type { FilterValue, GlobalFilter, WidgetExecuteResponse } from "@dashboardy/types";

import { useWidgetExecute } from "./use-widget-execute";

export type WidgetChromeProps = {
  accessToken: string;
  workspaceId: string;
  dashboardId: string;
  widgetId: string;
  savedQuestionId?: string;
  globalFilters?: GlobalFilter[];
  filterBindings?: Record<string, string>;
  filterOverrides?: Record<string, FilterValue>;
  globalFilterValues?: Record<string, FilterValue>;
  hasActiveOverrides?: boolean;
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
  savedQuestionId,
  globalFilters,
  filterBindings = {},
  filterOverrides = {},
  globalFilterValues = {},
  hasActiveOverrides = false,
  children,
}: WidgetChromeProps) {
  const { loading, error, data, refresh, forceFresh, isDraftPreview } = useWidgetExecute({
    accessToken,
    workspaceId,
    dashboardId,
    widgetId,
    savedQuestionId,
    globalFilters,
    filterBindings,
    filterOverrides,
    globalFilterValues,
  });

  return (
    <div className="flex h-full flex-col gap-2">
      {isDraftPreview ? (
        <p
          className="rounded-ds border border-border-2 bg-surface-2 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-ink-muted"
          role="status"
        >
          Draft preview — save dashboard to persist
        </p>
      ) : null}
      {hasActiveOverrides ? (
        <p
          className="rounded-ds border border-accent-border bg-accent-soft px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-accent-soft-ink"
          role="status"
        >
          Filter override active
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-2 text-[10px] uppercase tracking-wide text-ink-muted">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<DsIcon icon={RefreshCw} />}
          onClick={() => void refresh()}
          disabled={loading}
        >
          Refresh
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<DsIcon icon={Zap} />}
          onClick={() => void forceFresh()}
          disabled={loading}
        >
          Force fresh
        </Button>
        {data ? (
          <span>{data.meta.cache_hit ? "Cache hit" : "Cache miss"}</span>
        ) : null}
      </div>
      {children({ loading, error, data })}
    </div>
  );
}
