import * as React from "react";

/**
 * Alert — inline notice with a colored left rule, placed in the content flow
 * (not a toast). Use for typed execution outcomes, sanitized errors, security
 * notes, and permission refusals.
 */
export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Intent. @default "info" */
  tone?: "info" | "danger" | "success" | "warn";
  /** Bold title line. */
  title?: React.ReactNode;
  /** Optional leading icon (15–16px). */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function Alert(props: AlertProps): JSX.Element;
