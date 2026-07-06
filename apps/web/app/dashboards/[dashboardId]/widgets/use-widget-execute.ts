"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { FilterValue, GlobalFilter, WidgetExecuteResponse } from "@dashboardy/types";

import { ApiError, executeDashboardWidget } from "@/app/lib/dashboards-api";
import { executeSavedQuestion } from "@/app/lib/questions-api";

import {
  boundGlobalFilterValues,
  boundValuesKey,
  mergeWidgetParameters,
} from "../dashboard-filter-state";

const EMPTY_FILTER_VALUES: Record<string, FilterValue> = {};
const EMPTY_BINDINGS: Record<string, string> = {};
const EMPTY_OVERRIDES: Record<string, FilterValue> = {};
const EMPTY_GLOBAL_FILTERS: GlobalFilter[] = [];

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
  savedQuestionId?: string;
  globalFilters?: GlobalFilter[];
  filterBindings?: Record<string, string>;
  filterOverrides?: Record<string, FilterValue>;
  globalFilterValues?: Record<string, FilterValue>;
};

export function useWidgetExecute({
  accessToken,
  workspaceId,
  dashboardId,
  widgetId,
  savedQuestionId,
  globalFilters = EMPTY_GLOBAL_FILTERS,
  filterBindings = EMPTY_BINDINGS,
  filterOverrides = EMPTY_OVERRIDES,
  globalFilterValues = EMPTY_FILTER_VALUES,
}: UseWidgetExecuteOptions) {
  const isDraftPreview = Boolean(savedQuestionId && !widgetId);
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
  const draftParameters = useMemo(
    () =>
      isDraftPreview
        ? mergeWidgetParameters(
            globalFilters,
            globalFilterValues,
            filterBindings,
            filterOverrides,
          )
        : null,
    [
      isDraftPreview,
      globalFilters,
      globalFilterValues,
      filterBindings,
      filterOverrides,
    ],
  );
  const executionKey = isDraftPreview
    ? `${savedQuestionId}|${boundValuesKey(draftParameters ?? {})}`
    : boundKey;

  const run = useCallback(
    async (bypassCache = false) => {
      const seq = ++requestSeq.current;
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const data = isDraftPreview
          ? ((await executeSavedQuestion(
              accessToken,
              workspaceId,
              savedQuestionId!,
              {
                parameters: draftParameters ?? {},
                bypass_cache: bypassCache,
              },
            )) as WidgetExecuteResponse)
          : await executeDashboardWidget(
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
    [
      accessToken,
      workspaceId,
      dashboardId,
      widgetId,
      isDraftPreview,
      savedQuestionId,
      draftParameters,
    ],
  );

  useEffect(() => {
    void run(false);
  }, [executionKey, run]);

  return {
    ...state,
    isDraftPreview,
    refresh: () => run(false),
    forceFresh: () => run(true),
  };
}
