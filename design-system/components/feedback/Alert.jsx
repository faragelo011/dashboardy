import React from "react";

const CSS = `
.dby-alert{
  display:flex;gap:.625rem;padding:.75rem .875rem;border-radius:var(--radius-sm);
  font-family:var(--font-body);font-size:var(--text-body-sm);line-height:1.5;
  border-left:var(--border-width-accent) solid transparent;
}
.dby-alert__icon{flex:0 0 auto;margin-top:.05rem;display:inline-flex;}
.dby-alert__body{display:flex;flex-direction:column;gap:.15rem;min-width:0;}
.dby-alert__title{font-weight:var(--weight-semibold);}
.dby-alert--info{background:var(--color-accent-soft);border-left-color:var(--color-accent);color:var(--color-accent-soft-ink);}
.dby-alert--danger{background:var(--color-danger-soft);border-left-color:var(--color-danger);color:var(--color-danger);}
.dby-alert--success{background:var(--color-success-soft);border-left-color:var(--color-success);color:var(--color-success-ink);}
.dby-alert--warn{background:var(--color-warn-soft);border-left-color:var(--color-warn);color:var(--color-warn-ink);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-alert-css")) {
  const s = document.createElement("style");
  s.id = "dby-alert-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Alert — an inline notice with a colored left rule. Use for typed execution
 * outcomes, sanitized connection errors, security notes, and permission
 * refusals. Not a toast — it sits in the content flow.
 */
export function Alert({ tone = "info", title, icon, className = "", children, ...rest }) {
  const classes = ["dby-alert", `dby-alert--${tone}`, className].filter(Boolean).join(" ");
  return (
    <div
      className={classes}
      role={tone === "danger" ? "alert" : undefined}
      {...rest}
    >
      {icon ? <span className="dby-alert__icon" aria-hidden="true">{icon}</span> : null}
      <div className="dby-alert__body">
        {title ? <span className="dby-alert__title">{title}</span> : null}
        {children ? <span>{children}</span> : null}
      </div>
    </div>
  );
}
