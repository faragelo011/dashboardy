import * as React from "react";

/**
 * Button — primary action control for Dashboardy. Four variants map to intent:
 * `primary` (accent, main action), `secondary` (neutral, default), `ghost`
 * (low-emphasis / toolbar), `danger` (destructive). Dense by default.
 *
 * @startingPoint section="Forms" subtitle="Action buttons — 4 variants, 3 sizes" viewport="700x180"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual intent. @default "secondary" */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** Control size. @default "md" */
  size?: "sm" | "md" | "lg";
  /** Stretch to fill the container width. */
  fullWidth?: boolean;
  /** Icon element rendered before the label (e.g. a 15px Lucide SVG). */
  leftIcon?: React.ReactNode;
  /** Icon element rendered after the label. */
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export function Button(props: ButtonProps): JSX.Element;
