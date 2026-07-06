"use client";

import { RefreshCw } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Badge } from "./badge";
import { DsIcon } from "./icon";
import { IconButton } from "./icon-button";
import { Skeleton } from "./skeleton";

export type WidgetState = "ok" | "loading" | "error" | "empty";

export type WidgetProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  state?: WidgetState;
  error?: ReactNode;
  emptyMessage?: string;
  kpi?: ReactNode;
  override?: boolean;
  onRefresh?: () => void;
  footer?: ReactNode;
  minHeight?: number | string;
  children?: ReactNode;
};

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
}: WidgetProps) {
  const classes = ["dby-widget", className].filter(Boolean).join(" ");

  let body: ReactNode;
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
    <div
      className={classes}
      style={minHeight ? { minHeight } : undefined}
      {...rest}
    >
      <div className="dby-widget__head">
        <span className="dby-widget__title">{title}</span>
        <div className="dby-widget__chrome">
          {override ? <Badge tone="info">override</Badge> : null}
          {onRefresh ? (
            <IconButton variant="ghost" size="sm" aria-label="Force refresh" onClick={onRefresh}>
              <DsIcon icon={RefreshCw} size={14} />
            </IconButton>
          ) : null}
        </div>
      </div>
      <div className="dby-widget__body">{body}</div>
      {footer ? <div className="dby-widget__foot">{footer}</div> : null}
    </div>
  );
}
