import React from "react";

const CSS = `
.dby-nav{
  position:sticky;top:0;z-index:var(--z-header);
  border-bottom:1px solid var(--border-subtle);
  background:oklch(var(--surface-app) / .8);
  -webkit-backdrop-filter:saturate(1.6) blur(12px);backdrop-filter:saturate(1.6) blur(12px);
}
.dby-nav--static{position:static;}
.dby-nav__inner{
  margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;
  padding:.875rem 2rem;
}
.dby-nav__brand{
  font-family:var(--font-display);font-size:var(--text-body);font-weight:var(--weight-semibold);
  letter-spacing:var(--tracking-tight);color:var(--text-strong);text-decoration:none;
  transition:color var(--duration-fast) var(--ease-standard);white-space:nowrap;
}
.dby-nav__brand:hover{color:var(--color-accent);}
.dby-nav__right{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:.75rem;}
.dby-nav__links{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:.375rem;}
.dby-nav__link{
  border-radius:var(--radius-sm);padding:.375rem .625rem;
  font-size:var(--text-caption);font-weight:var(--weight-medium);letter-spacing:var(--tracking-tight);
  color:var(--text-muted);text-decoration:none;transition:var(--transition-colors);white-space:nowrap;
}
.dby-nav__link:hover{background:var(--surface-card);color:var(--text-primary);}
.dby-nav__link--active{background:var(--color-accent-soft);color:var(--color-accent-soft-ink);}
.dby-nav__divider{height:1.25rem;width:1px;flex-shrink:0;background:var(--border-default);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-nav-css")) {
  const s = document.createElement("style");
  s.id = "dby-nav-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * TopNav — the sticky workspace shell header: text wordmark, permission-gated
 * nav links, and an actions slot (theme toggle, sign out). Dashboardy has no
 * logo mark; the brand is set in type.
 */
export function TopNav({
  brand = "Dashboardy",
  brandHref = "/",
  items = [],
  actions,
  sticky = true,
  maxWidth = "var(--container-max)",
  className = "",
  ...rest
}) {
  const classes = ["dby-nav", sticky ? "" : "dby-nav--static", className]
    .filter(Boolean)
    .join(" ");
  return (
    <header className={classes} {...rest}>
      <div className="dby-nav__inner" style={{ maxWidth }}>
        <a className="dby-nav__brand" href={brandHref}>
          {brand}
        </a>
        <div className="dby-nav__right">
          <nav className="dby-nav__links" aria-label="Workspace">
            {items.map((it) => (
              <a
                key={it.href ?? it.label}
                href={it.href}
                className={`dby-nav__link${it.active ? " dby-nav__link--active" : ""}`}
                aria-current={it.active ? "page" : undefined}
                onClick={it.onClick}
              >
                {it.label}
              </a>
            ))}
          </nav>
          {actions ? (
            <React.Fragment>
              <span className="dby-nav__divider" aria-hidden="true" />
              {actions}
            </React.Fragment>
          ) : null}
        </div>
      </div>
    </header>
  );
}
