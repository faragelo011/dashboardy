import { describe, expect, test } from "vitest";

import type { GlobalFilter } from "@dashboardy/types";

import {
  boundGlobalFilterValues,
  boundValuesKey,
  mergeWidgetParameters,
  resolveHasActiveOverrides,
} from "../app/dashboards/[dashboardId]/dashboard-filter-state";

describe("dashboard filter state helpers", () => {
  const globalFilters: GlobalFilter[] = [
    {
      id: "region",
      label: "Region",
      value_type: "string",
      default_value: "EMEA",
    },
    {
      id: "min_amount",
      label: "Min amount",
      value_type: "number",
      default_value: 0,
    },
  ];

  test("boundGlobalFilterValues returns only bound keys present in values", () => {
    expect(
      boundGlobalFilterValues(
        { region: "p_region", missing: "p_missing" },
        { region: "APAC" },
      ),
    ).toEqual({ region: "APAC" });
  });

  test("boundValuesKey is stable for different key orderings", () => {
    const a = boundValuesKey({ region: "EMEA", min_amount: 10 });
    const b = boundValuesKey({ min_amount: 10, region: "EMEA" });
    expect(a).toEqual(b);
  });

  test("mergeWidgetParameters prefers overrides over runtime values over defaults", () => {
    expect(
      mergeWidgetParameters(
        globalFilters,
        { region: "NA", min_amount: 5 },
        { region: "p_region", min_amount: "p_min" },
        { region: "APAC" },
      ),
    ).toEqual({ p_region: "APAC", p_min: 5 });

    expect(
      mergeWidgetParameters(
        globalFilters,
        {},
        { region: "p_region", min_amount: "p_min" },
        {},
      ),
    ).toEqual({ p_region: "EMEA", p_min: 0 });
  });

  test("resolveHasActiveOverrides compares overrides against effective global values", () => {
    expect(
      resolveHasActiveOverrides(
        { filter_overrides: { region: "APAC" } },
        globalFilters,
        { region: "EMEA" },
      ),
    ).toBe(true);

    expect(
      resolveHasActiveOverrides(
        { filter_overrides: { region: "EMEA" } },
        globalFilters,
        { region: "EMEA" },
      ),
    ).toBe(false);

    // When runtime value missing, compare against declared default.
    expect(
      resolveHasActiveOverrides(
        { filter_overrides: { region: "APAC" } },
        globalFilters,
        {},
      ),
    ).toBe(true);
  });
});

