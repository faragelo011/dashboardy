import * as React from "react";

export interface NavItem {
  label: string;
  href?: string;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * TopNav — sticky workspace shell header. Text wordmark (no logo mark),
 * permission-gated nav links, and an actions slot. Gate `items` by role:
 * hide unreachable areas rather than disabling them.
 *
 * @startingPoint section="Navigation" subtitle="Sticky workspace shell header" viewport="1200x64"
 */
export interface TopNavProps extends React.HTMLAttributes<HTMLElement> {
  /** Wordmark text or node. @default "Dashboardy" */
  brand?: React.ReactNode;
  brandHref?: string;
  /** Nav links; set `active` on the current one. Gate by role before passing. */
  items?: NavItem[];
  /** Right-side actions (ThemeToggle, sign-out button, etc.). */
  actions?: React.ReactNode;
  /** Stick to the top on scroll. @default true */
  sticky?: boolean;
  /** Max inner width. @default "var(--container-max)" */
  maxWidth?: string;
}

export function TopNav(props: TopNavProps): JSX.Element;
