import * as React from "react";

/**
 * WorkspaceBadge — tenant/workspace identity chip, reinforcing the
 * single-workspace context.
 */
export interface WorkspaceBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The workspace name. */
  name: React.ReactNode;
  /** Leading label. @default "Workspace" */
  label?: string;
}

export function WorkspaceBadge(props: WorkspaceBadgeProps): JSX.Element;
