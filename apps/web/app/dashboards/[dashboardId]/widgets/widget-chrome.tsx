"use client";

import { RefreshCw, SlidersHorizontal, Zap } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ds/button";
import { DsIcon } from "@/components/ds/icon";

import type {
  ChartVizConfig,
  FilterValue,
  GlobalFilter,
  WidgetExecuteResponse,
} from "@dashboardy/types";

import { useWidgetExecute } from "./use-widget-execute";

export type WidgetChromeProps = {
  accessToken: string;
  workspaceId: string;
  dashboardId: string;
  widgetId: string;
  widgetType: "kpi" | "bar" | "line" | "table";
  widgetConfig?: ChartVizConfig;
  onWidgetConfigChange?: (next: ChartVizConfig) => void;
  enableVizSettings?: boolean;
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
  widgetType,
  widgetConfig,
  onWidgetConfigChange,
  enableVizSettings = false,
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

  const [vizOpen, setVizOpen] = useState(false);

  const columnNames = useMemo(() => {
    if (!data || data.meta.status !== "ok") {
      return [];
    }
    return data.columns.map((c) => c.name);
  }, [data]);

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
        {enableVizSettings &&
        (widgetType === "bar" || widgetType === "line") &&
        onWidgetConfigChange ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<DsIcon icon={SlidersHorizontal} />}
            onClick={() => setVizOpen((v) => !v)}
            disabled={loading}
          >
            Visualization
          </Button>
        ) : null}
        {data ? (
          <span>{data.meta.cache_hit ? "Cache hit" : "Cache miss"}</span>
        ) : null}
      </div>
      {vizOpen &&
      enableVizSettings &&
      (widgetType === "bar" || widgetType === "line") &&
      onWidgetConfigChange ? (
        <VizSettingsPanel
          columns={columnNames}
          config={widgetConfig ?? {}}
          onChange={(next) => onWidgetConfigChange(next)}
          onReset={() => onWidgetConfigChange({})}
          disabled={loading || !!error || data?.meta.status !== "ok"}
        />
      ) : null}
      {children({ loading, error, data })}
    </div>
  );
}

function VizSettingsPanel({
  columns,
  config,
  onChange,
  onReset,
  disabled,
}: {
  columns: string[];
  config: ChartVizConfig;
  onChange: (next: ChartVizConfig) => void;
  onReset: () => void;
  disabled: boolean;
}) {
  const resolvedXKey = useMemo(() => {
    const candidate = config.xKey ?? columns[0];
    if (!candidate) {
      return "";
    }
    const calculatedIds = config.calculatedFields?.map((f) => f.id) ?? [];
    const allColumns = new Set([...columns, ...calculatedIds]);
    return allColumns.has(candidate) ? candidate : columns[0] ?? "";
  }, [columns, config.xKey, config.calculatedFields]);

  const resolvedYKeys = useMemo(() => {
    const raw = config.yKeys?.length ? config.yKeys : columns[1] ? [columns[1]] : [];
    const calculatedIds = config.calculatedFields?.map((f) => f.id) ?? [];
    const allColumns = new Set([...columns, ...calculatedIds]);
    return raw.filter((k) => allColumns.has(k));
  }, [columns, config.yKeys, config.calculatedFields]);

  const resolvedSeriesKey = useMemo(() => {
    const candidate = config.seriesKey ?? "";
    if (!candidate) {
      return "";
    }
    const calculatedIds = config.calculatedFields?.map((f) => f.id) ?? [];
    const allColumns = new Set([...columns, ...calculatedIds]);
    return allColumns.has(candidate) ? candidate : "";
  }, [columns, config.seriesKey, config.calculatedFields]);

  const nullMode = config.nullHandling?.mode ?? "zero";

  const [calcKind, setCalcKind] = useState<"add" | "sub" | "mul" | "div">("add");
  const [calcLeft, setCalcLeft] = useState<string>("");
  const [calcRight, setCalcRight] = useState<string>("");

  const calculatedIds = config.calculatedFields?.map((f) => f.id) ?? [];
  const selectableColumns = Array.from(new Set([...columns, ...calculatedIds]));

  const safeCalcLeft = calcLeft && columns.includes(calcLeft) ? calcLeft : columns[0] ?? "";
  const safeCalcRight =
    calcRight && columns.includes(calcRight) ? calcRight : columns[1] ?? safeCalcLeft;

  return (
    <section className="ds-card flex flex-col gap-3 rounded-ds-md p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-ink-strong">Visualization</h3>
        <button
          type="button"
          className="ds-btn ds-btn-secondary px-2 py-1"
          onClick={onReset}
          disabled={disabled}
        >
          Reset
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="ds-label">X axis</span>
          <select
            className="ds-input"
            value={resolvedXKey}
            onChange={(e) =>
              onChange({ ...config, xKey: e.target.value || undefined })
            }
            disabled={disabled || selectableColumns.length === 0}
          >
            {selectableColumns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="ds-label">Breakout / Series</span>
          <select
            className="ds-input"
            value={resolvedSeriesKey}
            onChange={(e) =>
              onChange({ ...config, seriesKey: e.target.value || undefined })
            }
            disabled={disabled || selectableColumns.length === 0}
          >
            <option value="">None</option>
            {selectableColumns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <span className="ds-label">Y metrics</span>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {selectableColumns.map((c) => {
            const checked = resolvedYKeys.includes(c);
            return (
              <label
                key={c}
                className="flex items-center gap-2 text-[10px] text-ink-muted"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) => {
                    const next = new Set(resolvedYKeys);
                    if (e.target.checked) {
                      next.add(c);
                    } else {
                      next.delete(c);
                    }
                    const yKeys = Array.from(next);
                    onChange({
                      ...config,
                      yKeys: yKeys.length ? yKeys : undefined,
                    });
                  }}
                />
                <span className="max-w-[16ch] truncate">{c}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="ds-label">Nulls</span>
          <select
            className="ds-input"
            value={nullMode}
            onChange={(e) =>
              onChange({
                ...config,
                nullHandling: {
                  ...(config.nullHandling ?? {}),
                  mode: e.target.value === "skip" ? "skip" : "zero",
                },
              })
            }
            disabled={disabled}
          >
            <option value="zero">zero</option>
            <option value="skip">skip</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="ds-label">Limit</span>
          <input
            className="ds-input"
            type="number"
            min={0}
            step={1}
            value={config.limit ?? ""}
            placeholder="(none)"
            onChange={(e) => {
              const raw = e.target.value.trim();
              onChange({
                ...config,
                limit: raw === "" ? undefined : Math.max(0, Number(raw)),
              });
            }}
            disabled={disabled}
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="ds-label">Legend</span>
          <div className="flex items-center gap-2 text-[12px] text-ink-muted">
            <input
              type="checkbox"
              aria-label="Show legend"
              checked={config.legend?.enabled ?? false}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...config,
                  legend: { ...(config.legend ?? {}), enabled: e.target.checked },
                })
              }
            />
            <span>Show</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="ds-label">Sort key</span>
          <select
            className="ds-input"
            value={config.sort?.key ?? "x"}
            onChange={(e) =>
              onChange({
                ...config,
                sort: { ...(config.sort ?? {}), key: e.target.value as any },
              })
            }
            disabled={disabled}
          >
            <option value="x">x</option>
            <option value="first_y">first y</option>
            <option value="column">column</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="ds-label">Order</span>
          <select
            className="ds-input"
            value={config.sort?.order ?? "asc"}
            onChange={(e) =>
              onChange({
                ...config,
                sort: { ...(config.sort ?? {}), order: e.target.value as any },
              })
            }
            disabled={disabled}
          >
            <option value="asc">asc</option>
            <option value="desc">desc</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="ds-label">X as</span>
          <select
            className="ds-input"
            value={config.format?.x?.kind ?? "string"}
            onChange={(e) =>
              onChange({
                ...config,
                format: {
                  ...(config.format ?? {}),
                  x: { ...(config.format?.x ?? {}), kind: e.target.value as any },
                },
              })
            }
            disabled={disabled}
          >
            <option value="string">string</option>
            <option value="date">date</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="ds-label">Y decimals</span>
          <input
            className="ds-input"
            type="number"
            min={0}
            value={config.format?.y?.maximumFractionDigits ?? ""}
            placeholder="(default)"
            disabled={disabled}
            onChange={(e) => {
              const raw = e.target.value.trim();
              onChange({
                ...config,
                format: {
                  ...(config.format ?? {}),
                  y: {
                    ...(config.format?.y ?? {}),
                    maximumFractionDigits:
                      raw === "" ? undefined : Math.max(0, Number(raw)),
                  },
                },
              });
            }}
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="ds-label">Pivot</span>
          <div className="flex items-center gap-2 text-[12px] text-ink-muted">
            <input
              type="checkbox"
              aria-label="Enable pivot"
              checked={config.pivot?.enabled ?? false}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...config,
                  pivot: e.target.checked
                    ? { ...(config.pivot ?? {}), enabled: true }
                    : undefined,
                })
              }
            />
            <span>Enable</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="ds-label">Pivot key</span>
          <select
            className="ds-input"
            value={config.pivot?.pivotKey ?? ""}
            disabled={disabled || !(config.pivot?.enabled ?? false)}
            onChange={(e) =>
              onChange({
                ...config,
                pivot: {
                  ...(config.pivot ?? {}),
                  enabled: true,
                  pivotKey: e.target.value || undefined,
                },
              })
            }
          >
            <option value="">(none)</option>
            {selectableColumns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="ds-label">Pivot value</span>
          <select
            className="ds-input"
            value={config.pivot?.pivotValue ?? ""}
            disabled={disabled || !(config.pivot?.enabled ?? false)}
            onChange={(e) =>
              onChange({
                ...config,
                pivot: {
                  ...(config.pivot ?? {}),
                  enabled: true,
                  pivotValue: e.target.value || undefined,
                },
              })
            }
          >
            <option value="">(none)</option>
            {selectableColumns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-medium text-ink-strong">Calculated fields</h4>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="ds-label">Op</span>
            <select
              className="ds-input"
              value={calcKind}
              disabled={disabled}
              onChange={(e) => setCalcKind(e.target.value as any)}
            >
              <option value="add">add</option>
              <option value="sub">sub</option>
              <option value="mul">mul</option>
              <option value="div">div</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="ds-label">Left</span>
            <select
              className="ds-input"
              value={safeCalcLeft}
              disabled={disabled || columns.length === 0}
              onChange={(e) => setCalcLeft(e.target.value)}
            >
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="ds-label">Right</span>
            <select
              className="ds-input"
              value={safeCalcRight}
              disabled={disabled || columns.length === 0}
              onChange={(e) => setCalcRight(e.target.value)}
            >
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="ds-btn ds-btn-primary"
            disabled={disabled || !safeCalcLeft || !safeCalcRight}
            onClick={() => {
              const id = `calc_${crypto.randomUUID()}`
              const nextField = {
                id,
                label: `${calcKind}(${safeCalcLeft},${safeCalcRight})`,
                expression: {
                  kind: calcKind,
                  left: safeCalcLeft,
                  right: safeCalcRight,
                },
              };
              const nextFields = [...(config.calculatedFields ?? []), nextField];
              onChange({ ...config, calculatedFields: nextFields.length ? nextFields : undefined });
              setCalcLeft("");
              setCalcRight("");
            }}
          >
            Add
          </button>
        </div>

        {config.calculatedFields?.length ? (
          <ul className="flex flex-col gap-1">
            {config.calculatedFields.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-2 text-[10px] text-ink-muted"
              >
                <span className="truncate">{f.label ?? f.id}</span>
                <button
                  type="button"
                  className="rounded px-1 text-ink-muted hover:text-ink"
                  disabled={disabled}
                  onClick={() => {
                    const nextFields = (config.calculatedFields ?? []).filter(
                      (x) => x.id !== f.id,
                    );
                    onChange({
                      ...config,
                      calculatedFields: nextFields.length ? nextFields : undefined,
                    });
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ds-help">Optional: create virtual numeric columns for Y series.</p>
        )}
      </div>
    </section>
  );
}
