import * as React from "react";

/**
 * IconButton — square, icon-only control. Used for the theme toggle, table
 * row actions, and toolbar affordances. Always provide an `aria-label`.
 */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** `default` (bordered surface) or `ghost` (transparent until hover). @default "default" */
  variant?: "default" | "ghost";
  /** `md` = 32px, `sm` = 28px. @default "md" */
  size?: "sm" | "md";
  /** Accessible name — required since there is no visible label. */
  "aria-label": string;
  children?: React.ReactNode;
}

export function IconButton(props: IconButtonProps): JSX.Element;
