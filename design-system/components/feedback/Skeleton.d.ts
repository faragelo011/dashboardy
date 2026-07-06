import * as React from "react";

/**
 * Skeleton — pulsing placeholder block for loading states (app shell,
 * per-widget loading, table rows). Respects prefers-reduced-motion.
 */
export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Width — number (px) or CSS length. @default "100%" */
  width?: number | string;
  /** Height — number (px) or CSS length. @default "1rem" */
  height?: number | string;
  /** Render as a circle (avatars, dots). */
  circle?: boolean;
  /** Corner radius override — number (px) or CSS length. */
  radius?: number | string;
}

export function Skeleton(props: SkeletonProps): JSX.Element;
