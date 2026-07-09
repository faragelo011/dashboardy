import type { ChartVizConfig, WidgetExecuteResponse } from "@dashboardy/types";

export type TransformedChartSeries = {
  key: string;
  label: string;
};

export type TransformedChartDataset = {
  xKey: string;
  points: Array<Record<string, unknown>>;
  series: TransformedChartSeries[];
};

function isNil(v: unknown) {
  return v === null || v === undefined;
}

function toNumberOrNaN(v: unknown): number {
  if (typeof v === "number") {
    return v;
  }
  if (typeof v === "bigint") {
    return Number(v);
  }
  if (isNil(v)) {
    return NaN;
  }
  return Number(String(v));
}

function parseDateMs(v: unknown): number | null {
  if (isNil(v)) {
    return null;
  }
  const s = String(v);
  // Heuristic: avoid treating simple years like "2024" as dates unless it's ISO-like.
  const looksIso =
    s.includes("T") || s.match(/^\\d{4}-\\d{2}-\\d{2}/) || s.match(/^\\d{4}-\\d{2}-\\d{2}T/);
  if (!looksIso) {
    return null;
  }
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? null : ms;
}

function compareValues(a: unknown, b: unknown) {
  const aNum = toNumberOrNaN(a);
  const bNum = toNumberOrNaN(b);
  if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
    return aNum - bNum;
  }

  const aDate = parseDateMs(a);
  const bDate = parseDateMs(b);
  if (aDate !== null && bDate !== null) {
    return aDate - bDate;
  }

  const aStr = isNil(a) ? "" : String(a);
  const bStr = isNil(b) ? "" : String(b);
  return aStr.localeCompare(bStr);
}

function applyCalculatedFieldsToRow(
  row: Record<string, unknown>,
  calculatedFields: ChartVizConfig["calculatedFields"] | undefined,
  nullMode: "zero" | "skip",
): void {
  if (!calculatedFields?.length) {
    return;
  }

  for (const field of calculatedFields) {
    const expr = field.expression;
    if (expr.kind === "add" || expr.kind === "sub" || expr.kind === "mul" || expr.kind === "div") {
      const left = toNumberOrNaN(row[expr.left]);
      const right = toNumberOrNaN(row[expr.right]);
      if (!Number.isFinite(left) || !Number.isFinite(right)) {
        row[field.id] = nullMode === "zero" ? 0 : undefined;
        continue;
      }
      let out: number;
      if (expr.kind === "add") out = left + right;
      else if (expr.kind === "sub") out = left - right;
      else if (expr.kind === "mul") out = left * right;
      else out = right === 0 ? NaN : left / right;
      row[field.id] = Number.isFinite(out) ? out : nullMode === "zero" ? 0 : undefined;
    } else if (expr.kind === "coalesce") {
      const picked = expr.args.map((k) => row[k]).find((v) => !isNil(v));
      row[field.id] = picked;
    } else if (expr.kind === "concat") {
      const sep = expr.separator ?? "";
      const parts = expr.args
        .map((k) => row[k])
        .filter((v) => !isNil(v))
        .map((v) => String(v));
      row[field.id] = parts.join(sep);
    }
  }
}

function toYNumber(
  raw: unknown,
  nullMode: "zero" | "skip",
): number | undefined {
  const n = toNumberOrNaN(raw);
  if (!Number.isFinite(n)) {
    return nullMode === "zero" ? 0 : undefined;
  }
  return n;
}

export function transformChartDataset(
  data: WidgetExecuteResponse | null,
  config: ChartVizConfig,
): TransformedChartDataset {
  if (!data || data.meta.status !== "ok") {
    return { xKey: "", points: [], series: [] };
  }
  if (data.columns.length < 2) {
    return { xKey: "", points: [], series: [] };
  }

  const baseColumns = data.columns.map((c) => c.name);
  const calculatedIds = config.calculatedFields?.map((f) => f.id) ?? [];
  const availableColumns = [...baseColumns, ...calculatedIds];

  const xKey =
    (config.xKey && availableColumns.includes(config.xKey)
      ? config.xKey
      : baseColumns[0]) ?? baseColumns[0];

  const yKeysResolved =
    config.yKeys?.length && config.yKeys.some((k) => availableColumns.includes(k))
      ? config.yKeys.filter((k) => availableColumns.includes(k))
      : baseColumns[1]
        ? [baseColumns[1]]
        : [];

  if (!xKey || yKeysResolved.length === 0) {
    return { xKey: "", points: [], series: [] };
  }

  const nullMode = config.nullHandling?.mode ?? "zero";

  // Pivot is treated as a convenience alias:
  // If enabled, use pivotKey as seriesKey (unless seriesKey already set),
  // and pivotValue as the single yKey when yKeys are omitted.
  const pivotEnabled =
    config.pivot?.enabled && config.pivot.pivotKey && config.pivot.pivotValue;
  const pivotKey = pivotEnabled ? config.pivot!.pivotKey! : undefined;
  const pivotValue = pivotEnabled ? config.pivot!.pivotValue! : undefined;
  const requestedSeriesKey =
    config.seriesKey &&
    config.seriesKey !== "" &&
    availableColumns.includes(config.seriesKey)
      ? config.seriesKey
      : undefined;
  const seriesKey = requestedSeriesKey ?? pivotKey;
  const yKeys: string[] =
    config.yKeys?.length && config.yKeys.length > 0
      ? yKeysResolved
      : pivotValue
        ? [pivotValue]
        : yKeysResolved;

  const seriesOrder: string[] = [];
  const seriesMeta = new Map<string, TransformedChartSeries>();

  type PointAgg = { xRaw: unknown; seriesValues: Map<string, number> };
  const pointAggByX = new Map<string, PointAgg>();

  for (const row of data.rows) {
    const rowObj: Record<string, unknown> = {};
    for (let i = 0; i < data.columns.length; i++) {
      rowObj[data.columns[i].name] = row[i];
    }

    applyCalculatedFieldsToRow(rowObj, config.calculatedFields, nullMode);

    const xRaw = rowObj[xKey];
    const xId = isNil(xRaw) ? "" : String(xRaw);
    if (!pointAggByX.has(xId)) {
      pointAggByX.set(xId, { xRaw, seriesValues: new Map() });
    }
    const pointAgg = pointAggByX.get(xId)!;

    const seriesVal = seriesKey ? rowObj[seriesKey] : undefined;
    const seriesValStr = seriesKey
      ? isNil(seriesVal)
        ? ""
        : String(seriesVal)
      : "";

    for (const yKey of yKeys) {
      const dataKey = seriesKey ? `${yKey}__${seriesValStr}` : yKey;
      if (!seriesMeta.has(dataKey)) {
        const label = seriesKey
          ? `${seriesValStr || "(none)"} • ${yKey}`
          : yKey;
        const seriesDef: TransformedChartSeries = { key: dataKey, label };
        seriesMeta.set(dataKey, seriesDef);
        seriesOrder.push(dataKey);
      }

      const yNumber = toYNumber(rowObj[yKey], nullMode);
      if (yNumber === undefined) {
        continue;
      }

      const existing = pointAgg.seriesValues.get(dataKey) ?? 0;
      pointAgg.seriesValues.set(dataKey, existing + yNumber);
    }
  }

  // Build point list.
  let points: Array<Record<string, unknown>> = [];
  for (const agg of Array.from(pointAggByX.values())) {
    const p: Record<string, unknown> = { x: agg.xRaw };
    for (const seriesKey of seriesOrder) {
      const v = agg.seriesValues.get(seriesKey);
      if (v === undefined) {
        p[seriesKey] = undefined;
      } else {
        p[seriesKey] = v;
      }
    }
    points.push(p);
  }

  // Sorting + limiting (reshape-only).
  const sortKey = config.sort?.key ?? "x";
  const sortOrder = config.sort?.order ?? "asc";
  const sortMul = sortOrder === "desc" ? -1 : 1;

  const sortActive =
    config.sort?.key !== undefined ||
    config.sort?.order !== undefined ||
    config.sort?.column !== undefined;

  if (sortActive && points.length > 1) {
    points.sort((a, b) => {
      if (sortKey === "x") {
        return compareValues(a.x, b.x) * sortMul;
      }

      if (sortKey === "column") {
        const column = config.sort?.column;
        if (!column) {
          return compareValues(a.x, b.x) * sortMul;
        }
        if (column === xKey) {
          return compareValues(a.x, b.x) * sortMul;
        }

        // If sorting by a Y column, treat each row as aggregated and sort by the corresponding value.
        if (!seriesKey && yKeys.includes(column)) {
          const av = typeof a[column] === "number" ? (a[column] as number) : 0;
          const bv = typeof b[column] === "number" ? (b[column] as number) : 0;
          return (av - bv) * sortMul;
        }

        if (seriesKey && yKeys.includes(column)) {
          const prefix = `${column}__`;
          let av = 0;
          let bv = 0;
          for (const dk of seriesOrder) {
            if (!dk.startsWith(prefix)) continue;
            av += typeof a[dk] === "number" ? (a[dk] as number) : 0;
            bv += typeof b[dk] === "number" ? (b[dk] as number) : 0;
          }
          return (av - bv) * sortMul;
        }

        return compareValues(a.x, b.x) * sortMul;
      }

      // first_y: sort by the first y series; when we have breakouts, sort by
      // the sum across all series produced by yKeys[0].
      if (sortKey === "first_y") {
        const firstY = yKeys[0];
        if (!seriesKey) {
          const dk = firstY;
          const av = typeof a[dk] === "number" ? (a[dk] as number) : 0;
          const bv = typeof b[dk] === "number" ? (b[dk] as number) : 0;
          return (av - bv) * sortMul;
        }
        const prefix = `${firstY}__`;
        let av = 0;
        let bv = 0;
        for (const dk of seriesOrder) {
          if (!dk.startsWith(prefix)) continue;
          av += typeof a[dk] === "number" ? (a[dk] as number) : 0;
          bv += typeof b[dk] === "number" ? (b[dk] as number) : 0;
        }
        return (av - bv) * sortMul;
      }

      return 0;
    });
  }

  const limit = config.limit;
  if (limit !== undefined && Number.isFinite(limit) && limit > 0) {
    points = points.slice(0, limit);
  }

  return {
    xKey,
    points,
    series: seriesOrder.map((k) => seriesMeta.get(k)!).filter(Boolean),
  };
}

