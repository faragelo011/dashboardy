import React from "react";

const CSS = `
.dby-checkbox{display:inline-flex;align-items:center;gap:.5rem;cursor:pointer;font-size:var(--text-body-sm);color:var(--text-primary);}
.dby-checkbox input{
  height:1rem;width:1rem;flex:0 0 auto;cursor:pointer;
  border:1px solid var(--border-default);border-radius:var(--radius-sm);
  accent-color:var(--color-accent);
}
.dby-checkbox input:focus-visible{outline:none;box-shadow:var(--shadow-focus);}
.dby-checkbox--disabled{opacity:.55;cursor:not-allowed;}
.dby-checkbox--disabled input{cursor:not-allowed;}
.dby-checkbox__text{color:var(--text-muted);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-checkbox-css")) {
  const s = document.createElement("style");
  s.id = "dby-checkbox-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Checkbox — a boolean control with an inline label. Uses the native input
 * tinted with the accent color (matches the app's `accent-accent` checkboxes).
 */
export const Checkbox = React.forwardRef(function Checkbox(
  { label, disabled = false, className = "", children, ...rest },
  ref,
) {
  const classes = ["dby-checkbox", disabled ? "dby-checkbox--disabled" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <label className={classes}>
      <input ref={ref} type="checkbox" disabled={disabled} {...rest} />
      {label || children ? (
        <span className="dby-checkbox__text">{label ?? children}</span>
      ) : null}
    </label>
  );
});
