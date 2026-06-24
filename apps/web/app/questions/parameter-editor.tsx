"use client";

import type { ParameterDefinition, ParameterType } from "@dashboardy/types";

const fieldClass =
  "w-full bg-[#0B0F15] border border-white/10 px-3 py-2 text-[#F0F2F5] text-[13px] focus:outline-none focus:border-[#D4AF37]/50 rounded-sm";

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">
          Parameters
        </span>
        <button
          type="button"
          disabled={disabled}
          className="text-[10px] uppercase tracking-[0.15em] text-[#D4AF37] hover:text-[#FBE398] disabled:opacity-50"
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
        <p className="text-xs text-[#5C6A7A]">No parameters declared.</p>
      ) : null}

      {value.map((row, index) => {
        const isDuplicate = row.name.trim() && dupes.has(row.name.trim());
        return (
          <div
            key={`param-${index}`}
            className="grid gap-3 border border-white/10 p-4 sm:grid-cols-2"
          >
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">Name</span>
              <input
                className={fieldClass}
                value={row.name}
                disabled={disabled}
                onChange={(e) => updateRow(index, { name: e.target.value })}
                aria-invalid={isDuplicate || undefined}
              />
              {isDuplicate ? (
                <span className="text-xs text-[#EF4444]">Duplicate parameter name</span>
              ) : null}
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">Type</span>
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
            <label className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={row.required}
                disabled={disabled}
                onChange={(e) => updateRow(index, { required: e.target.checked })}
              />
              <span className="text-xs text-[#A0AAB2]">Required</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">Label</span>
              <input
                className={fieldClass}
                value={row.label ?? ""}
                disabled={disabled}
                onChange={(e) => updateRow(index, { label: e.target.value || null })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">Default</span>
              <input
                className={fieldClass}
                value={row.default === null || row.default === undefined ? "" : String(row.default)}
                disabled={disabled}
                onChange={(e) => {
                  const raw = e.target.value;
                  updateRow(index, { default: raw === "" ? null : raw });
                }}
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="button"
                disabled={disabled}
                className="text-[10px] uppercase tracking-[0.15em] text-[#EF4444] hover:text-white"
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
