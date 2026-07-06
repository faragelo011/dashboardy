import type { FilterValue, GlobalFilter } from "@dashboardy/types";

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
