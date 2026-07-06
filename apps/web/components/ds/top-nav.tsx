"use client";

import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";

import { DsIcon } from "./icon";
import { navIconForHref } from "./nav-icons";

export type TopNavItem = {
  href: string;
  label: string;
  active?: boolean;
};

export type TopNavProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  brand?: string;
  brandHref?: string;
  items?: TopNavItem[];
  actions?: ReactNode;
  sticky?: boolean;
  maxWidth?: string;
  showNavIcons?: boolean;
};

export function TopNav({
  brand = "Dashboardy",
  brandHref = "/",
  items = [],
  actions,
  sticky = true,
  maxWidth = "var(--container-max)",
  showNavIcons = true,
  className = "",
  ...rest
}: TopNavProps) {
  const classes = ["dby-nav", sticky ? "" : "dby-nav--static", className]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={classes} {...rest}>
      <div className="dby-nav__inner" style={{ maxWidth }}>
        <Link className="dby-nav__brand" href={brandHref}>
          {brand}
        </Link>
        <div className="dby-nav__right">
          <nav className="dby-nav__links" aria-label="Workspace">
            {items.map((it) => {
              const NavIcon = showNavIcons ? navIconForHref(it.href) : undefined;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`dby-nav__link${it.active ? " dby-nav__link--active" : ""}`}
                  aria-current={it.active ? "page" : undefined}
                >
                  {NavIcon ? (
                    <DsIcon icon={NavIcon} size="inline" className="dby-nav__link-icon" />
                  ) : null}
                  {it.label}
                </Link>
              );
            })}
          </nav>
          {actions ? (
            <>
              <span className="dby-nav__divider" aria-hidden="true" />
              {actions}
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
