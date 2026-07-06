import React from "react";

const CSS = `
.dby-empty{
  display:flex;flex-direction:column;align-items:center;gap:.5rem;text-align:center;
  padding:3rem 1.5rem;background:var(--surface-card);
  border:1px dashed var(--border-strong);border-radius:var(--radius-md);
}
.dby-empty__icon{color:var(--text-faint);margin-bottom:.25rem;display:inline-flex;}
.dby-empty__kicker{font-size:var(--text-micro);font-weight:600;letter-spacing:var(--tracking-kicker);
  text-transform:uppercase;color:var(--text-muted);}
.dby-empty__desc{font-size:var(--text-caption);line-height:1.45;color:var(--text-muted);max-width:40ch;}
.dby-empty__action{margin-top:.5rem;}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-empty-css")) {
  const s = document.createElement("style");
  s.id = "dby-empty-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * EmptyState — a dashed panel for "nothing here yet" surfaces: no collections,
 * no questions, no dashboards, no grants, no results. Kicker + description +
 * optional action.
 */
export function EmptyState({ title, description, icon, action, className = "", ...rest }) {
  const classes = ["dby-empty", className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {icon ? <span className="dby-empty__icon" aria-hidden="true">{icon}</span> : null}
      {title ? <span className="dby-empty__kicker">{title}</span> : null}
      {description ? <span className="dby-empty__desc">{description}</span> : null}
      {action ? <div className="dby-empty__action">{action}</div> : null}
    </div>
  );
}
