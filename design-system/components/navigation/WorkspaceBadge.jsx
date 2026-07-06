import React from "react";

const CSS = `
.dby-wsbadge{
  display:inline-flex;align-items:center;gap:.5rem;
  border:1px solid var(--border-subtle);background:var(--surface-card);
  border-radius:var(--radius-sm);padding:.25rem .625rem;
  font-size:var(--text-caption);color:var(--text-primary);white-space:nowrap;
}
.dby-wsbadge__label{color:var(--text-muted);}
.dby-wsbadge__name{font-weight:var(--weight-medium);color:var(--text-strong);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-wsbadge-css")) {
  const s = document.createElement("style");
  s.id = "dby-wsbadge-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * WorkspaceBadge — the tenant/workspace identity chip. Reinforces the
 * single-workspace context (MVP) at the top of primary surfaces.
 */
export function WorkspaceBadge({ name, label = "Workspace", className = "", ...rest }) {
  const classes = ["dby-wsbadge", className].filter(Boolean).join(" ");
  return (
    <div className={classes} data-testid="workspace-badge" {...rest}>
      <span className="dby-wsbadge__label">{label}</span>
      <span className="dby-wsbadge__name">{name}</span>
    </div>
  );
}
