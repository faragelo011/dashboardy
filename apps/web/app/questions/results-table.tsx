"use client";

import type { QueryExecuteSuccessResponse } from "@dashboardy/types";

type Props = {
  result: QueryExecuteSuccessResponse;
};

export function ResultsTable({ result }: Props) {
  const { columns, rows, meta } = result;
  const refusal =
    meta.status !== "ok"
      ? meta.error_code
        ? `${meta.status}: ${meta.error_code}`
        : meta.status
      : null;

  return (
    <div className="dby-code-window flex flex-col gap-4 p-5">
      <div className="flex flex-wrap gap-4 text-[10px] uppercase tracking-[0.15em] dby-code-window__faint">
        <span>Status: {meta.status}</span>
        <span>{meta.duration_ms} ms</span>
        <span>{meta.row_count} rows</span>
        {meta.truncated ? <span>Truncated</span> : null}
        <span>Cache: {meta.cache_hit ? "hit" : "miss"}</span>
      </div>

      {refusal ? (
        <p className="text-sm text-danger-ink" role="alert">
          {refusal}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm dby-code-window__muted">No rows returned.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm font-mono">
            <thead>
              <tr className="border-b border-border-2 text-left text-[10px] uppercase tracking-[0.15em] dby-code-window__faint">
                {columns.map((col) => (
                  <th key={col.name} className="px-3 py-2 font-medium">
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="border-b border-border-1">
                  {row.map((cell, cellIndex) => (
                    <td key={`cell-${rowIndex}-${cellIndex}`} className="px-3 py-2 text-ink-strong">
                      {cell === null || cell === undefined ? "" : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
