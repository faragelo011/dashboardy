"use client";

import { useCallback, useEffect, useState } from "react";

import type { FilterValue, WidgetExecuteResponse } from "@dashboardy/types";

import { ApiError, executeDashboardWidget } from "@/app/lib/dashboards-api";

const EMPTY_FILTER_VALUES: Record<string, FilterValue> = {};

export type WidgetExecuteState = {
  loading: boolean;
  error: string | null;
  data: WidgetExecuteResponse | null;
};

export function useWidgetExecute(
  accessToken: string,
  workspaceId: string,
  dashboardId: string,
  widgetId: string,
  globalFilterValues: Record<string, FilterValue> = EMPTY_FILTER_VALUES,
) {
  const [state, setState] = useState<WidgetExecuteState>({
    loading: true,
    error: null,
    data: null,
  });

  const run = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await executeDashboardWidget(
        accessToken,
        workspaceId,
        dashboardId,
        widgetId,
        { global_filter_values: globalFilterValues, bypass_cache: false },
      );
      setState({ loading: false, error: null, data });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Widget execution failed.";
      setState({ loading: false, error: message, data: null });
    }
  }, [accessToken, workspaceId, dashboardId, widgetId, globalFilterValues]);

  useEffect(() => {
    void run();
  }, [run]);

  return { ...state, refresh: run };
}
