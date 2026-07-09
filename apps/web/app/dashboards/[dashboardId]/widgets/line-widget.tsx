"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { WidgetChrome, type WidgetChromeProps } from "./widget-chrome";
import { transformChartDataset } from "./viz/transform";

type LineWidgetProps = Omit<WidgetChromeProps, "children">;

function tickLabelForNumber(value: unknown, maximumFractionDigits?: number) {
  if (typeof value !== "number") {
    return String(value ?? "");
  }
  if (maximumFractionDigits === undefined) {
    return String(value);
  }
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

function tickLabelForDate(value: unknown) {
  const ms = Date.parse(String(value ?? ""));
  if (Number.isNaN(ms)) {
    return String(value ?? "");
  }
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short" }).format(
    new Date(ms),
  );
}

const PALETTE = [
  "oklch(var(--viz-1))",
  "oklch(var(--viz-2))",
  "oklch(var(--viz-3))",
  "oklch(var(--viz-4))",
  "oklch(var(--viz-5))",
  "oklch(var(--viz-6))",
  "oklch(var(--viz-7))",
  "oklch(var(--viz-8))",
];
function colorForSeries(index: number) {
  return PALETTE[index % PALETTE.length];
}

export function LineWidget({
  title,
  ...chromeProps
}: LineWidgetProps & { title?: string | null }) {
  const showLegend = chromeProps.widgetConfig?.legend?.enabled === true;
  const yMax = chromeProps.widgetConfig?.format?.y?.maximumFractionDigits;
  const xKind = chromeProps.widgetConfig?.format?.x?.kind;
  return (
    <WidgetChrome {...chromeProps}>
      {({ loading, error, data }) => {
        const dataset = transformChartDataset(data, chromeProps.widgetConfig ?? {});
        return (
          <div className="flex h-full min-h-[200px] flex-col gap-2 rounded-ds-lg border border-border-1 bg-surface-0 p-4">
            {title ? (
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                {title}
              </p>
            ) : null}
            {loading ? (
              <p className="text-sm text-ink-muted">Loading…</p>
            ) : error ? (
              <p className="text-sm text-danger-ink" role="alert">
                {error}
              </p>
            ) : dataset.points.length === 0 || dataset.series.length === 0 ? (
              <p className="text-sm text-ink-muted">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataset.points}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="x"
                    tick={{ fontSize: 11 }}
                    tickFormatter={xKind === "date" ? tickLabelForDate : undefined}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => tickLabelForNumber(v, yMax)}
                  />
                  <Tooltip />
                  {showLegend ? <Legend /> : null}
                  {dataset.series.map((s, i) => (
                    <Line
                      key={s.key}
                      name={s.label}
                      type="monotone"
                      dataKey={s.key}
                      stroke={colorForSeries(i)}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        );
      }}
    </WidgetChrome>
  );
}
