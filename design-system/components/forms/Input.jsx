import React from "react";

const CSS = `
.dby-input{
  width:100%;background:var(--surface-base);border:1px solid var(--border-default);
  border-radius:var(--radius-sm);padding:.5625rem .75rem;
  font-family:var(--font-body);font-size:var(--text-body-sm);line-height:1.4;
  color:var(--text-primary);transition:var(--transition-control);
}
.dby-input::placeholder{color:var(--text-faint);}
.dby-input:not(:disabled):hover{border-color:var(--border-strong);}
.dby-input:focus{outline:none;border-color:var(--color-accent);box-shadow:var(--shadow-focus);background:var(--surface-base);}
.dby-input:disabled{opacity:.55;cursor:not-allowed;background:var(--surface-card);}
.dby-input[aria-invalid="true"]{border-color:var(--color-danger);}
.dby-input[aria-invalid="true"]:focus{box-shadow:0 0 0 3px oklch(var(--danger-ink) / .16);}
.dby-input--sm{padding:.375rem .5rem;font-size:var(--text-caption);}
.dby-input--mono{font-family:var(--font-mono);font-size:var(--text-body-sm);letter-spacing:var(--tracking-tight);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-input-css")) {
  const s = document.createElement("style");
  s.id = "dby-input-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Input — single-line text field (text, email, password, number, date, search).
 * Mirrors the app's `.ds-input`. Set `invalid` to wire the danger + aria state.
 */
export const Input = React.forwardRef(function Input(
  { size = "md", mono = false, invalid = false, className = "", type = "text", ...rest },
  ref,
) {
  const classes = [
    "dby-input",
    size === "sm" ? "dby-input--sm" : "",
    mono ? "dby-input--mono" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <input
      ref={ref}
      type={type}
      className={classes}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});
