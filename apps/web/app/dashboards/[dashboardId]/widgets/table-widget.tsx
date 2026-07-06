"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";

import type { FilterValue, WidgetExecuteResponse } from "@dashboardy/types";

import { exportDashboardWidgetCsv } from "@/app/lib/dashboards-api";
import { ApiError } from "@/app/lib/connections-api";
import { Button } from "@/components/ds/button";
import { DsIcon } from "@/components/ds/icon";

import { WidgetChrome, type WidgetChromeProps } from "./widget-chrome";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const EMPTY_FILTER_VALUES: Record<string, FilterValue> = {};

type TableWidgetProps = Omit<WidgetChromeProps, "children"> & {
  canExport?: boolean;
};

function encodeFilterState(
  globalFilterValues: Record<string, FilterValue>,
): string {
  return encodeURIComponent(
    JSON.stringify({ global_filter_values: globalFilterValues }),
  );
}

export function TableWidget({
  title,
  widgetId,
  canExport = false,
  globalFilterValues: globalFilterValuesProp,
  accessToken,
  workspaceId,
  dashboardId,
  ...chromeProps
}: TableWidgetProps & { title?: string | null }) {
  const globalFilterValues = globalFilterValuesProp ?? EMPTY_FILTER_VALUES;
  const exportAllowed = canExport && Boolean(widgetId);
  const filterKey = useMemo(
    () => JSON.stringify(globalFilterValues),
    [globalFilterValues],
  );
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    setPage(0);
  }, [filterKey, widgetId]);

  return (
    <WidgetChrome
      accessToken={accessToken}
      workspaceId={workspaceId}
      dashboardId={dashboardId}
      widgetId={widgetId}
      globalFilterValues={globalFilterValues}
      {...chromeProps}
    >
      {({ loading, error, data }) => (
        <TableWidgetBody
          title={title}
          loading={loading}
          error={error}
          data={data}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(0);
          }}
          canExport={exportAllowed}
          exporting={exporting}
          exportError={exportError}
          onExport={async () => {
            if (!canExport) {
              return;
            }
            setExporting(true);
            setExportError(null);
            try {
              const response = await exportDashboardWidgetCsv(
                accessToken,
                workspaceId,
                dashboardId,
                widgetId,
                {
                  filter_state: encodeFilterState(globalFilterValues),
                  bypass_cache: false,
                },
              );
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = `dashboard-${dashboardId}-widget-${widgetId}.csv`;
              anchor.click();
              URL.revokeObjectURL(url);
            } catch (err) {
              setExportError(
                err instanceof ApiError
                  ? err.message
                  : err instanceof Error
                    ? err.message
                    : "Export failed.",
              );
            } finally {
              setExporting(false);
            }
          }}
        />
      )}
    </WidgetChrome>
  );
}

function TableWidgetBody({
  title,
  loading,
  error,
  data,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  canExport,
  exporting,
  exportError,
  onExport,
}: {
  title?: string | null;
  loading: boolean;
  error: string | null;
  data: WidgetExecuteResponse | null;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  canExport: boolean;
  exporting: boolean;
  exportError: string | null;
  onExport: () => Promise<void>;
}) {
  const rowCount = data?.rows?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(rowCount / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(() => {
    const allRows = data?.rows ?? [];
    const start = currentPage * pageSize;
    return allRows.slice(start, start + pageSize);
  }, [data?.rows, currentPage, pageSize]);

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden rounded-lg border border-border-1 bg-surface-1 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {title ? (
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {title}
          </p>
        ) : (
          <span />
        )}
        {canExport && data?.meta.status === "ok" ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={exporting || loading}
            leftIcon={<DsIcon icon={Download} />}
            onClick={() => void onExport()}
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        ) : null}
      </div>
      {exportError ? (
        <p className="text-sm text-danger-ink" role="alert">
          {exportError}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : error ? (
        <p className="text-sm text-danger-ink" role="alert">
          {error}
        </p>
      ) : !data || data.meta.status !== "ok" ? (
        <p className="text-sm text-ink-muted">No data</p>
      ) : rowCount === 0 ? (
        <p className="text-sm text-ink-muted">Empty result</p>
      ) : (
        <>
          <div className="overflow-auto">
            <table className="w-full min-w-[240px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border-1">
                  {data.columns.map((col) => (
                    <th
                      key={col.name}
                      className="px-2 py-1.5 text-xs font-medium text-ink-muted"
                    >
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, rowIndex) => (
                  <tr
                    key={`${currentPage}-${rowIndex}`}
                    className="border-b border-border-1/60"
                  >
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-2 py-1.5 text-ink">
                        {cell === null || cell === undefined ? "—" : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
            <label className="flex items-center gap-2">
              Rows per page
              <select
                className="ds-input py-0.5 text-xs"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <span>
                Page {currentPage + 1} of {pageCount}
              </span>
              <button
                type="button"
                className="rounded border border-border-2 px-2 py-0.5 disabled:opacity-40"
                disabled={currentPage <= 0}
                onClick={() => onPageChange(currentPage - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded border border-border-2 px-2 py-0.5 disabled:opacity-40"
                disabled={currentPage >= pageCount - 1}
                onClick={() => onPageChange(currentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
