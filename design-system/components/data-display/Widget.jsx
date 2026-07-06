import React from "react";
import { Badge } from "../feedback/Badge.jsx";
import { Skeleton } from "../feedback/Skeleton.jsx";
import { IconButton } from "../forms/IconButton.jsx";

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" />
  </svg>
);

const CSS = `
.dby-widget{display:flex;flex-direction:column;gap:.5rem;height:100%;min-height:0;
  border:1px solid var(--border-subtle);background:var(--surface-base);
  border-radius:var(--radius-lg);padding:1.1rem 1.15rem;box-shadow:var(--shadow-card);}
.dby-widget__head{display:flex;align-items:center;justify-content:space-between;gap:.5rem;min-height:1.25rem;}
.dby-widget__title{font-size:var(--text-caption);font-weight:var(--weight-medium);
  text-transform:uppercase;letter-spacing:var(--tracking-wide);color:var(--text-muted);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dby-widget__chrome{display:flex;align-items:center;gap:.375rem;flex-shrink:0;}
.dby-widget__body{flex:1;min-height:0;display:flex;flex-direction:column;}
.dby-widget__msg{font-size:var(--text-body-sm);color:var(--text-muted);}
.dby-widget__msg--error{color:var(--color-danger);}
.dby-widget__kpi{font-family:var(--font-display);font-size:2.1rem;line-height:1;font-weight:var(--weight-semibold);
  letter-spacing:var(--tracking-tighter);color:var(--text-strong);font-variant-numeric:tabular-nums;
  display:flex;align-items:center;flex:1;}
.dby-widget__foot{font-size:var(--text-micro);color:var(--text-faint);letter-spacing:var(--tracking-wide);
  display:flex;gap:.75rem;flex-wrap:wrap;}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-widget-css")) {
  const s = document.createElement("style");
  s.id = "dby-widget-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Widget — the dashboard widget frame (chrome) for KPI, bar, line, and table
 * content. Owns the title, the visible override indicator, per-widget refresh,
 * and the loading/error/empty states so one slow widget never blocks the
 * canvas. The chart/value/table itself is passed as children.
 */
export function Widget({
  title,
  state = "ok",
  error,
  emptyMessage = "No data",
  kpi,
  override = false,
  onRefresh,
  footer,
  minHeight,
  className = "",
  children,
  ...rest
}) {
  const classes = ["dby-widget", className].filter(Boolean).join(" ");
  let body;
  if (state === "loading") {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, justifyContent: "center" }}>
        <Skeleton width="55%" height={22} />
        <Skeleton width="85%" height={12} />
        <Skeleton width="70%" height={12} />
      </div>
    );
  } else if (state === "error") {
    body = (
      <p className="dby-widget__msg dby-widget__msg--error" role="alert">
        {error || "Execution failed"}
      </p>
    );
  } else if (state === "empty") {
    body = <p className="dby-widget__msg">{emptyMessage}</p>;
  } else if (kpi !== undefined) {
    body = <div className="dby-widget__kpi">{kpi}</div>;
  } else {
    body = children;
  }

  return (
    <div className={classes} style={minHeight ? { minHeight } : undefined} {...rest}>
      <div className="dby-widget__head">
        <span className="dby-widget__title">{title}</span>
        <div className="dby-widget__chrome">
          {override ? <Badge tone="info">override</Badge> : null}
          {onRefresh ? (
            <IconButton variant="ghost" size="sm" aria-label="Force refresh" onClick={onRefresh}>
              <RefreshIcon />
            </IconButton>
          ) : null}
        </div>
      </div>
      <div className="dby-widget__body">{body}</div>
      {footer ? <div className="dby-widget__foot">{footer}</div> : null}
    </div>
  );
}
