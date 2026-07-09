import { describe, expect, test } from "vitest";

import type { ChartVizConfig, WidgetExecuteResponse } from "@dashboardy/types";

import { transformChartDataset } from "../app/dashboards/[dashboardId]/widgets/viz/transform";

function okResponse(
  columns: WidgetExecuteResponse["columns"],
  rows: WidgetExecuteResponse["rows"],
): WidgetExecuteResponse {
  return {
    columns,
    rows,
    meta: {
      status: "ok",
      duration_ms: 1,
      row_count: rows.length,
      truncated: false,
      cache_hit: false,
      error_code: null,
    },
  };
}

describe("transformChartDataset", () => {
  test("defaults to x=first column and y=second column", () => {
    const data = okResponse(
      [{ name: "year" }, { name: "revenue" }],
      [
        [2024, 10],
        [2023, 5],
      ],
    );

    const out = transformChartDataset(data, {} as ChartVizConfig);
    expect(out.series.map((s) => s.key)).toEqual(["revenue"]);
    expect(out.points).toHaveLength(2);
    // Points are keyed by x value.
    const p2024 = out.points.find((p) => p.x === 2024);
    expect(p2024?.revenue).toBe(10);
  });

  test("supports breakout via seriesKey (multi-series)", () => {
    const data = okResponse(
      [{ name: "month" }, { name: "academy" }, { name: "amount" }],
      [
        ["2024-01", "A", 10],
        ["2024-01", "B", 5],
        ["2024-02", "A", 7],
      ],
    );

    const out = transformChartDataset(data, {
      xKey: "month",
      yKeys: ["amount"],
      seriesKey: "academy",
      nullHandling: { mode: "skip" },
    });

    expect(out.series.map((s) => s.key).sort()).toEqual(["amount__A", "amount__B"].sort());
    const p = out.points.find((pt) => pt.x === "2024-01")!;
    expect(p["amount__A"]).toBe(10);
    expect(p["amount__B"]).toBe(5);
  });

  test("supports calculated fields referenced by yKeys", () => {
    const data = okResponse(
      [{ name: "a" }, { name: "b" }],
      [[2, 3]],
    );

    const out = transformChartDataset(data, {
      xKey: "a",
      yKeys: ["sum_ab"],
      calculatedFields: [
        {
          id: "sum_ab",
          label: "a+b",
          expression: { kind: "add", left: "a", right: "b" },
        },
      ],
      nullHandling: { mode: "zero" },
    });

    expect(out.series.map((s) => s.key)).toEqual(["sum_ab"]);
    expect(out.points).toHaveLength(1);
    expect(out.points[0].x).toBe(2);
    expect(out.points[0].sum_ab).toBe(5);
  });

  test("sort and limit", () => {
    const data = okResponse(
      [{ name: "x" }, { name: "y" }],
      [
        [3, 7],
        [1, 10],
        [2, 5],
      ],
    );

    const out = transformChartDataset(data, {
      sort: { key: "x", order: "asc" },
      limit: 2,
    });

    expect(out.points.map((p) => p.x)).toEqual([1, 2]);
  });

  test("nullHandling=skip leaves y undefined", () => {
    const data = okResponse(
      [{ name: "x" }, { name: "y" }],
      [
        [1, null],
        [2, 4],
      ],
    );

    const out = transformChartDataset(data, {
      yKeys: ["y"],
      nullHandling: { mode: "skip" },
      sort: { key: "x", order: "asc" },
    });

    const p1 = out.points.find((p) => p.x === 1)!;
    expect(p1.y).toBeUndefined();
    const p2 = out.points.find((p) => p.x === 2)!;
    expect(p2.y).toBe(4);
  });
});

