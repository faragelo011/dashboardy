import * as React from "react";

/**
 * Widget — dashboard widget frame (chrome) for KPI / bar / line / table
 * content. Owns the title, the always-visible override indicator, per-widget
 * force-refresh, and independent loading/error/empty states (partial dashboard
 * render). Pass the chart/table as children, or a scalar via `kpi`.
 *
 * @startingPoint section="Data" subtitle="Dashboard widget frame — states + override" viewport="420x220"
 */
export interface WidgetProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Widget title (rendered uppercase in the chrome). */
  title?: React.ReactNode;
  /** Load state. @default "ok" */
  state?: "ok" | "loading" | "error" | "empty";
  /** Error message shown when `state="error"`. */
  error?: React.ReactNode;
  /** Message shown when `state="empty"`. @default "No data" */
  emptyMessage?: React.ReactNode;
  /** Scalar KPI value — renders the large-figure body (shortcut for KPI widgets). */
  kpi?: React.ReactNode;
  /** Show the "override" indicator — required when the widget diverges from the global filter bar. */
  override?: boolean;
  /** Force-refresh (cache bypass) handler; renders the refresh control. */
  onRefresh?: () => void;
  /** Footer chips (freshness / cache / row count). */
  footer?: React.ReactNode;
  /** Min height (grid sizing). */
  minHeight?: number | string;
  children?: React.ReactNode;
}

export function Widget(props: WidgetProps): JSX.Element;
