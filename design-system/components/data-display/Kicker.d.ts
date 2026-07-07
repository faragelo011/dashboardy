import * as React from "react";

/**
 * Kicker — uppercase eyebrow above headings and section labels
 * (11px / 600 / wide tracking / muted).
 */
export interface KickerProps extends React.HTMLAttributes<HTMLElement> {
  /** Element to render. @default "p" */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export function Kicker(props: KickerProps): JSX.Element;
