"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { FilterValue, WidgetExecuteResponse } from "@dashboardy/types";

import { ApiError, executeDashboardWidget } from "@/app/lib/dashboards-api";

import {
  boundGlobalFilterValues,
  boundValuesKey,
} from "../dashboard-filter-state";

const EMPTY_FILTER_VALUES: Record<string, FilterValue> = {};
const EMPTY_BINDINGS: Record<string, string> = {};

export type WidgetExecuteState = {
  loading: boolean;
  error: string | null;
  data: WidgetExecuteResponse | null;
};

type UseWidgetExecuteOptions = {
  accessToken: string;
  workspaceId: string;
  dashboardId: string;
  widgetId: string;
  filterBindings?: Record<string, string>;
  globalFilterValues?: Record<string, FilterValue>;
};

export function useWidgetExecute({
  accessToken,
  workspaceId,
  dashboardId,
  widgetId,
  filterBindings = EMPTY_BINDINGS,
  globalFilterValues = EMPTY_FILTER_VALUES,
}: UseWidgetExecuteOptions) {
  const [state, setState] = useState<WidgetExecuteState>({
    loading: true,
    error: null,
    data: null,
  });
  const requestSeq = useRef(0);
  const globalFilterValuesRef = useRef(globalFilterValues);
  globalFilterValuesRef.current = globalFilterValues;

  const boundValues = useMemo(
    () => boundGlobalFilterValues(filterBindings, globalFilterValues),
    [filterBindings, globalFilterValues],
  );
  const boundKey = boundValuesKey(boundValues);

  const run = useCallback(
    async (bypassCache = false) => {
      const seq = ++requestSeq.current;
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const data = await executeDashboardWidget(
          accessToken,
          workspaceId,
          dashboardId,
          widgetId,
          {
            global_filter_values: globalFilterValuesRef.current,
            bypass_cache: bypassCache,
          },
        );
        if (seq !== requestSeq.current) {
          return;
        }
        setState({ loading: false, error: null, data });
      } catch (err) {
        if (seq !== requestSeq.current) {
          return;
        }
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Widget execution failed.";
        setState({ loading: false, error: message, data: null });
      }
    },
    [accessToken, workspaceId, dashboardId, widgetId],
  );

  useEffect(() => {
    void run(false);
  }, [boundKey, run]);

  return {
    ...state,
    refresh: () => run(false),
    forceFresh: () => run(true),
  };
}
