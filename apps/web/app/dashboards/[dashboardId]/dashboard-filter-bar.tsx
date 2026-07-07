"use client";

import { Filter } from "lucide-react";

import type { FilterValue, GlobalFilter, GlobalFilterValueType } from "@dashboardy/types";

import { DsIcon } from "@/components/ds/icon";

type DashboardFilterBarProps = {
  globalFilters: GlobalFilter[];
  values: Record<string, FilterValue>;
  onChange: (next: Record<string, FilterValue>) => void;
};

function inputForType(
  valueType: GlobalFilterValueType,
  value: FilterValue,
  onValue: (next: FilterValue) => void,
) {
  switch (valueType) {
    case "boolean":
      return (
        <select
          className="ds-input"
          value={String(value)}
          onChange={(e) => onValue(e.target.value === "true")}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    case "number":
      return (
        <input
          type="number"
          className="ds-input"
          value={String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              return;
            }
            const parsed = Number(raw);
            if (Number.isFinite(parsed)) {
              onValue(parsed);
            }
          }}
        />
      );
    case "date":
      return (
        <input
          type="date"
          className="ds-input"
          value={String(value)}
          onChange={(e) => onValue(e.target.value)}
        />
      );
    default:
      return (
        <input
          type="text"
          className="ds-input"
          value={String(value)}
          onChange={(e) => onValue(e.target.value)}
        />
      );
  }
}

export { inputForType as filterInputForType };

export function DashboardFilterBar({
  globalFilters,
  values,
  onChange,
}: DashboardFilterBarProps) {
  if (globalFilters.length === 0) {
    return null;
  }

  return (
    <section className="ds-card flex flex-col gap-4 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-strong">
        <DsIcon icon={Filter} size="sm" className="text-ink-muted" />
        Global filters
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {globalFilters.map((filter) => (
          <label key={filter.id} className="flex flex-col gap-1.5">
            <span className="ds-label">{filter.label}</span>
            {inputForType(filter.value_type, values[filter.id] ?? filter.default_value, (next) =>
              onChange({ ...values, [filter.id]: next }),
            )}
          </label>
        ))}
      </div>
    </section>
  );
}
