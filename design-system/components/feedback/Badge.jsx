import React from "react";

const CSS = `
.dby-badge{
  display:inline-flex;align-items:center;gap:.3125rem;
  padding:.1875rem .5625rem;border-radius:var(--radius-full);
  border:1px solid var(--border-default);background:var(--surface-card);
  color:var(--text-muted);font-family:var(--font-body);
  font-size:var(--text-micro);font-weight:var(--weight-medium);
  letter-spacing:.02em;line-height:1.4;white-space:nowrap;
}
.dby-badge__dot{width:.4375rem;height:.4375rem;border-radius:var(--radius-full);
  background:var(--text-faint);flex-shrink:0;}
.dby-badge--ok{color:var(--color-success-ink);background:var(--color-success-soft);border-color:oklch(var(--success) / .3);}
.dby-badge--ok .dby-badge__dot{background:var(--color-success);}
.dby-badge--warn{color:var(--color-warn-ink);background:var(--color-warn-soft);border-color:oklch(var(--warn) / .3);}
.dby-badge--warn .dby-badge__dot{background:var(--color-warn);}
.dby-badge--danger{color:var(--color-danger);background:var(--color-danger-soft);border-color:var(--color-danger-border);}
.dby-badge--danger .dby-badge__dot{background:var(--color-danger);}
.dby-badge--info{color:var(--color-accent-soft-ink);background:var(--color-accent-soft);border-color:var(--color-accent-border);}
.dby-badge--info .dby-badge__dot{background:var(--color-accent);}
.dby-badge--idle .dby-badge__dot{background:var(--text-faint);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-badge-css")) {
  const s = document.createElement("style");
  s.id = "dby-badge-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Badge — a compact status pill with a leading status dot. The dot shape +
 * text label mean status never relies on color alone (WCAG). Use for
 * connection lifecycle, execution outcomes, member status, export flags.
 */
export function Badge({ tone = "neutral", dot = true, className = "", children, ...rest }) {
  const classes = ["dby-badge", tone !== "neutral" ? `dby-badge--${tone}` : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={classes} {...rest}>
      {dot ? <span className="dby-badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
