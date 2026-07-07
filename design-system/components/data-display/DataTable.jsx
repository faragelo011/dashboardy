import React from "react";
import { Button } from "../forms/Button.jsx";

const CSS = `
.dby-table-wrap{width:100%;overflow-x:auto;}
.dby-table{width:100%;border-collapse:collapse;text-align:left;font-size:var(--text-body-sm);}
.dby-table thead th{
  padding:.375rem .625rem;font-size:var(--text-micro);font-weight:var(--weight-semibold);
  letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--text-faint);
  border-bottom:1px solid var(--border-default);white-space:nowrap;
}
.dby-table tbody td{padding:.5rem .625rem;color:var(--text-primary);border-bottom:1px solid var(--border-subtle);vertical-align:middle;}
.dby-table tbody tr:last-child td{border-bottom:0;}
.dby-table tbody tr:hover td{background:var(--surface-card);}
.dby-table__mono{font-family:var(--font-mono);font-size:var(--text-body-sm);letter-spacing:var(--tracking-tight);color:var(--text-muted);}
.dby-table__cell--right{text-align:right;}
.dby-table__cell--center{text-align:center;}
.dby-table__empty{padding:1.5rem .625rem;color:var(--text-muted);font-size:var(--text-body-sm);}
.dby-table__pager{display:flex;align-items:center;justify-content:space-between;gap:1rem;
  padding-top:.75rem;margin-top:.25rem;border-top:1px solid var(--border-subtle);}
.dby-table__range{font-size:var(--text-caption);color:var(--text-muted);font-variant-numeric:tabular-nums;}
.dby-table__pager-btns{display:flex;gap:.5rem;}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-table-css")) {
  const s = document.createElement("style");
  s.id = "dby-table-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * DataTable — columnar data with optional client-side pagination over a
 * server-capped result set (never an unbounded "load more"). Columns declare
 * alignment, monospace, and custom cell renderers.
 */
export function DataTable({
  columns = [],
  rows = [],
  pageSize,
  emptyMessage = "No rows returned.",
  getRowKey,
  className = "",
  ...rest
}) {
  const [page, setPage] = React.useState(0);
  const paginated = typeof pageSize === "number" && pageSize > 0;
  const total = rows.length;
  const pageCount = paginated ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const current = Math.min(page, pageCount - 1);
  const start = paginated ? current * pageSize : 0;
  const view = paginated ? rows.slice(start, start + pageSize) : rows;

  const alignClass = (a) =>
    a === "right" ? " dby-table__cell--right" : a === "center" ? " dby-table__cell--center" : "";

  return (
    <div className={["dby-table-shell", className].filter(Boolean).join(" ")} {...rest}>
      <div className="dby-table-wrap">
        <table className="dby-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={alignClass(c.align).replace("dby-table__cell", "dby-table__cell")}
                  style={{ textAlign: c.align || "left", width: c.width }}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.length === 0 ? (
              <tr>
                <td className="dby-table__empty" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              view.map((row, i) => (
                <tr key={getRowKey ? getRowKey(row, start + i) : start + i}>
                  {columns.map((c) => {
                    const content = c.render ? c.render(row, start + i) : row[c.key];
                    return (
                      <td
                        key={c.key}
                        className={(c.mono ? "dby-table__mono" : "") + alignClass(c.align)}
                        style={{ textAlign: c.align || "left" }}
                      >
                        {content === null || content === undefined || content === "" ? "—" : content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {paginated && total > pageSize ? (
        <div className="dby-table__pager">
          <span className="dby-table__range">
            {start + 1}–{Math.min(start + pageSize, total)} of {total}
          </span>
          <div className="dby-table__pager-btns">
            <Button
              variant="secondary"
              size="sm"
              disabled={current === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={current >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
