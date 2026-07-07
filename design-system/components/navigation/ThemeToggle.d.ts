import * as React from "react";

/**
 * ThemeToggle — light/dark switch. Sets `data-theme` on the document element
 * and persists to localStorage (`dashboardy-theme`). Renders a sun in dark
 * mode and a moon in light mode.
 */
export interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function ThemeToggle(props: ThemeToggleProps): JSX.Element;
