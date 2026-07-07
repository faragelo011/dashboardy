import * as React from "react";

/**
 * EmptyState — dashed panel for "nothing here yet" surfaces (no collections,
 * questions, dashboards, grants, or results).
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Short kicker-style title (e.g. "No grants"). */
  title?: React.ReactNode;
  /** Explanatory line. */
  description?: React.ReactNode;
  /** Optional icon above the title. */
  icon?: React.ReactNode;
  /** Optional action (e.g. a Button) below the text. */
  action?: React.ReactNode;
}

export function EmptyState(props: EmptyStateProps): JSX.Element;
