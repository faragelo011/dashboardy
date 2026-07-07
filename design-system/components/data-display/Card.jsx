import React from "react";

const CSS = `
.dby-card{background:var(--surface-base);border:1px solid var(--border-subtle);border-radius:var(--radius-md);box-shadow:var(--shadow-card);}
.dby-card--inset{background:var(--surface-sunken);box-shadow:none;}
.dby-card--dashed{border-style:dashed;border-color:var(--border-strong);box-shadow:none;}
.dby-card--pad-sm{padding:1.25rem;}
.dby-card--pad-md{padding:1.5rem;}
.dby-card--pad-lg{padding:1.75rem;}
.dby-card__head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1rem;}
.dby-card__title{font-family:var(--font-display);font-size:var(--text-h2);font-weight:var(--weight-semibold);
  letter-spacing:var(--tracking-tight);color:var(--text-strong);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-card-css")) {
  const s = document.createElement("style");
  s.id = "dby-card-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Card — the flat, border-defined surface that holds almost everything:
 * forms, panels, list rows, widgets. No drop shadow — elevation is expressed
 * with borders + surface tints. Optional title/actions header.
 */
export function Card({
  inset = false,
  dashed = false,
  padding = "md",
  title,
  actions,
  className = "",
  children,
  ...rest
}) {
  const classes = [
    "dby-card",
    inset ? "dby-card--inset" : "",
    dashed ? "dby-card--dashed" : "",
    padding && padding !== "none" ? `dby-card--pad-${padding}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} {...rest}>
      {title || actions ? (
        <div className="dby-card__head">
          {title ? <h2 className="dby-card__title">{title}</h2> : <span />}
          {actions ? <div>{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
