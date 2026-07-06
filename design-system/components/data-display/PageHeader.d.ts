import * as React from "react";

/**
 * PageHeader — standard screen header (kicker + title + description) with an
 * optional actions cluster and an above-title slot (e.g. WorkspaceBadge).
 *
 * @startingPoint section="Layout" subtitle="Screen header — kicker, title, actions" viewport="900x180"
 */
export interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  /** Uppercase eyebrow. */
  kicker?: React.ReactNode;
  /** Page title (renders an h1). */
  title?: React.ReactNode;
  /** Supporting description (≤60ch). */
  description?: React.ReactNode;
  /** Right-aligned actions (buttons, status). */
  actions?: React.ReactNode;
  /** Slot above the kicker (e.g. WorkspaceBadge). */
  above?: React.ReactNode;
  /** Bottom hairline + padding. @default true */
  bordered?: boolean;
}

export function PageHeader(props: PageHeaderProps): JSX.Element;
