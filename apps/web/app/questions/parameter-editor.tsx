"use client";

import type { ParameterDefinition, ParameterType } from "@dashboardy/types";

const fieldClass = "dby-input dby-input--sm";

const types: ParameterType[] = ["string", "number", "boolean", "date"];

type Props = {
  value: ParameterDefinition[];
  onChange: (next: ParameterDefinition[]) => void;
  disabled?: boolean;
};

function duplicateNames(rows: ParameterDefinition[]): Set<string> {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const row of rows) {
    const name = row.name.trim();
    if (!name) {
      continue;
    }
    if (seen.has(name)) {
      dupes.add(name);
    }
    seen.add(name);
  }
  return dupes;
}

function coerceDefaultValue(
  type: ParameterType,
  raw: string,
): string | number | boolean | null {
  if (raw === "") {
    return null;
  }
  if (type === "boolean") {
    if (raw === "true") {
      return true;
    }
    if (raw === "false") {
      return false;
    }
    return raw;
  }
  if (type === "number") {
    if (/^-?\d+$/.test(raw)) {
      return Number.parseInt(raw, 10);
    }
    if (/^-?\d+\.\d+$/.test(raw)) {
      return Number.parseFloat(raw);
    }
    return raw;
  }
  return raw;
}

export function ParameterEditor({ value, onChange, disabled = false }: Props) {
  const dupes = duplicateNames(value);

  const updateRow = (index: number, patch: Partial<ParameterDefinition>) => {
    const next = value.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  };

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-strong">Parameters</p>
          <p className="text-xs text-ink-muted">
            Scalar inputs bound into SQL at run time.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          className="dby-btn dby-btn--secondary ds-btn--sm"
          onClick={() =>
            onChange([
              ...value,
              { name: "", type: "string", required: false, label: null, default: null },
            ])
          }
        >
          Add parameter
        </button>
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-ink-faint">No parameters declared.</p>
      ) : null}

      {value.map((row, index) => {
        const isDuplicate = row.name.trim() && dupes.has(row.name.trim());
        return (
          <div
            key={`param-${index}`}
            className="grid gap-3 rounded-ds-md border border-border-1 bg-surface-0 p-4 sm:grid-cols-2"
          >
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="ds-label">Name</span>
              <input
                className={fieldClass}
                value={row.name}
                disabled={disabled}
                onChange={(e) => updateRow(index, { name: e.target.value })}
                aria-invalid={isDuplicate || undefined}
                placeholder="param_name"
              />
              {isDuplicate ? (
                <span className="text-xs text-danger-ink">Duplicate parameter name</span>
              ) : null}
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="ds-label">Type</span>
              <select
                className={fieldClass}
                value={row.type}
                disabled={disabled}
                onChange={(e) =>
                  updateRow(index, { type: e.target.value as ParameterType })
                }
              >
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="dby-checkbox items-center pt-6">
              <input
                type="checkbox"
                checked={row.required}
                disabled={disabled}
                onChange={(e) => updateRow(index, { required: e.target.checked })}
              />
              <span className="dby-checkbox__text">Required</span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="ds-label">Label</span>
              <input
                className={fieldClass}
                value={row.label ?? ""}
                disabled={disabled}
                onChange={(e) => updateRow(index, { label: e.target.value || null })}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="ds-label">Default</span>
              {row.type === "boolean" ? (
                <select
                  className={fieldClass}
                  value={
                    row.default === true
                      ? "true"
                      : row.default === false
                        ? "false"
                        : ""
                  }
                  disabled={disabled}
                  onChange={(e) =>
                    updateRow(index, {
                      default: coerceDefaultValue(row.type, e.target.value),
                    })
                  }
                >
                  <option value="">No default</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input
                  className={fieldClass}
                  type={row.type === "number" ? "number" : "text"}
                  value={
                    row.default === null || row.default === undefined
                      ? ""
                      : String(row.default)
                  }
                  disabled={disabled}
                  onChange={(e) => {
                    updateRow(index, {
                      default: coerceDefaultValue(row.type, e.target.value),
                    });
                  }}
                />
              )}
            </label>
            <div className="sm:col-span-2">
              <button
                type="button"
                disabled={disabled}
                className="text-xs font-medium text-danger-ink hover:underline"
                onClick={() => removeRow(index)}
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
