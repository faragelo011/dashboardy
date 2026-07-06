import type { FilterValue, GlobalFilter } from "@dashboardy/types";
import type {
  DashboardWidget,
  DashboardWidgetConsumer,
} from "@dashboardy/types";

/** Initialize runtime filter values from dashboard definition defaults. */
export function initialGlobalFilterValues(
  globalFilters: GlobalFilter[],
): Record<string, FilterValue> {
  const values: Record<string, FilterValue> = {};
  for (const filter of globalFilters) {
    values[filter.id] = filter.default_value;
  }
  return values;
}

/** Subset of values for filters bound to a widget. */
export function boundGlobalFilterValues(
  filterBindings: Record<string, string>,
  globalFilterValues: Record<string, FilterValue>,
): Record<string, FilterValue> {
  const bound: Record<string, FilterValue> = {};
  for (const globalFilterId of Object.keys(filterBindings)) {
    if (globalFilterId in globalFilterValues) {
      bound[globalFilterId] = globalFilterValues[globalFilterId];
    }
  }
  return bound;
}

export function boundValuesKey(values: Record<string, FilterValue>): string {
  return JSON.stringify(
    Object.entries(values).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function resolveGlobalFilterValue(
  globalFilters: GlobalFilter[],
  globalFilterValues: Record<string, FilterValue>,
  globalFilterId: string,
): FilterValue | undefined {
  if (globalFilterId in globalFilterValues) {
    return globalFilterValues[globalFilterId];
  }
  return globalFilters.find((filter) => filter.id === globalFilterId)
    ?.default_value;
}

function filterValuesEqual(
  left: FilterValue,
  right: FilterValue | undefined,
): boolean {
  if (right === undefined) {
    return false;
  }
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Whether any stored override differs from the current global filter bar value. */
export function resolveHasActiveOverrides(
  widget: DashboardWidget | DashboardWidgetConsumer,
  globalFilters: GlobalFilter[],
  globalFilterValues: Record<string, FilterValue>,
): boolean {
  const overrides = widget.filter_overrides ?? {};
  if (Object.keys(overrides).length === 0) {
    return false;
  }
  for (const [globalFilterId, overrideValue] of Object.entries(overrides) as Array<
    [string, FilterValue]
  >) {
    const globalValue = resolveGlobalFilterValue(
      globalFilters,
      globalFilterValues,
      globalFilterId,
    );
    if (!filterValuesEqual(overrideValue, globalValue)) {
      return true;
    }
  }
  return false;
}
