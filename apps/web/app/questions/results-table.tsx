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
    <div className="flex flex-col gap-4 border border-white/10 p-6">
      <div className="flex flex-wrap gap-4 text-[10px] uppercase tracking-[0.15em] text-[#374151]">
        <span>Status: {meta.status}</span>
        <span>{meta.duration_ms} ms</span>
        <span>{meta.row_count} rows</span>
        {meta.truncated ? <span>Truncated</span> : null}
        <span>Cache: {meta.cache_hit ? "hit" : "miss"}</span>
      </div>

      {refusal ? (
        <p className="text-sm text-[#EF4444]" role="alert">
          {refusal}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-[#94A3B8]">No rows returned.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-[0.15em] text-[#374151]">
                {columns.map((col) => (
                  <th key={col.name} className="px-3 py-2 font-medium">
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="border-b border-white/5">
                  {row.map((cell, cellIndex) => (
                    <td key={`cell-${rowIndex}-${cellIndex}`} className="px-3 py-2 text-[#F8FAFC]">
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
