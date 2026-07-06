import React from "react";

const CSS = `
.dby-stat{display:flex;flex-direction:column;gap:.375rem;}
.dby-stat__label{font-size:var(--text-micro);font-weight:var(--weight-semibold);
  letter-spacing:var(--tracking-kicker);text-transform:uppercase;color:var(--text-muted);}
.dby-stat__value{font-family:var(--font-display);font-size:var(--text-stat);line-height:1;
  font-weight:var(--weight-semibold);letter-spacing:var(--tracking-tighter);color:var(--text-strong);
  font-variant-numeric:tabular-nums;}
.dby-stat__value--sm{font-size:1.5rem;}
.dby-stat__hint{font-size:var(--text-caption);color:var(--text-muted);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-stat-css")) {
  const s = document.createElement("style");
  s.id = "dby-stat-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Stat — a large counted figure in the monospace stack. Use for directory
 * counts and KPI-style figures. Label sits above as a kicker; optional hint
 * below for comparison context.
 */
export function Stat({ value, label, hint, size = "md", className = "", ...rest }) {
  return (
    <div className={["dby-stat", className].filter(Boolean).join(" ")} {...rest}>
      {label ? <span className="dby-stat__label">{label}</span> : null}
      <span className={`dby-stat__value${size === "sm" ? " dby-stat__value--sm" : ""}`}>{value}</span>
      {hint ? <span className="dby-stat__hint">{hint}</span> : null}
    </div>
  );
}
