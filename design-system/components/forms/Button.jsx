import React from "react";

/* Inject component CSS once per document (hover/active/focus states that
   inline styles can't express). Values mirror the app's .ds-btn exactly. */
const CSS = `
.dby-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:.375rem;
  border-radius:var(--radius-sm);padding:.5625rem 1.05rem;
  font-family:var(--font-body);font-size:var(--text-body-sm);font-weight:600;
  line-height:1.2;border:1px solid transparent;cursor:pointer;white-space:nowrap;
  transition:var(--transition-control);text-decoration:none;
}
.dby-btn:focus-visible{outline:none;box-shadow:var(--shadow-focus);}
.dby-btn:active:not(:disabled){transform:scale(0.985);}
.dby-btn:disabled,.dby-btn[aria-disabled="true"]{opacity:.5;cursor:not-allowed;}
.dby-btn--sm{padding:.375rem .75rem;font-size:var(--text-caption);}
.dby-btn--lg{padding:.6875rem 1.35rem;font-size:var(--text-body);}
.dby-btn--full{width:100%;}
.dby-btn__icon{display:inline-flex;flex:0 0 auto;}

.dby-btn--primary{background:var(--color-accent);color:var(--text-on-accent);border-color:transparent;box-shadow:var(--shadow-xs);}
.dby-btn--primary:not(:disabled):hover{background:var(--color-accent-hover);border-color:var(--color-accent-hover);}
.dby-btn--primary:not(:disabled):active{background:var(--color-accent-active);border-color:var(--color-accent-active);}

.dby-btn--secondary{background:var(--surface-base);color:var(--text-primary);border-color:var(--border-default);box-shadow:var(--shadow-xs);}
.dby-btn--secondary:not(:disabled):hover{background:var(--surface-raised);border-color:var(--border-strong);}

.dby-btn--ghost{background:transparent;color:var(--text-muted);border-color:transparent;}
.dby-btn--ghost:not(:disabled):hover{background:var(--surface-card);color:var(--text-primary);}

.dby-btn--danger{background:var(--color-danger-soft);color:var(--color-danger);border-color:var(--color-danger-border);}
.dby-btn--danger:not(:disabled):hover{background:oklch(var(--danger-soft-strong));border-color:var(--color-danger);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-btn-css")) {
  const s = document.createElement("style");
  s.id = "dby-btn-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Button — the primary action control. Four variants, three sizes.
 * Matches Dashboardy's `.ds-btn` system (dense, 4px radius, 120ms transitions).
 */
export function Button({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = "",
  type = "button",
  children,
  ...rest
}) {
  const classes = [
    "dby-btn",
    `dby-btn--${variant}`,
    size !== "md" ? `dby-btn--${size}` : "",
    fullWidth ? "dby-btn--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {leftIcon ? <span className="dby-btn__icon">{leftIcon}</span> : null}
      {children}
      {rightIcon ? <span className="dby-btn__icon">{rightIcon}</span> : null}
    </button>
  );
}
