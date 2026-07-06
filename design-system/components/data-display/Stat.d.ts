import * as React from "react";

/**
 * Stat — large counted figure in the monospace stack (directory counts,
 * KPI figures). Kicker label above, optional hint below.
 */
export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The figure (e.g. "02", "1,284", "$23.8M"). */
  value: React.ReactNode;
  /** Kicker label above the value. */
  label?: React.ReactNode;
  /** Comparison / context line below. */
  hint?: React.ReactNode;
  /** `md` (32px) or `sm` (24px). @default "md" */
  size?: "sm" | "md";
}

export function Stat(props: StatProps): JSX.Element;
