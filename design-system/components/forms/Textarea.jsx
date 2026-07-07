import React from "react";

const CSS = `
.dby-textarea{
  width:100%;background:var(--surface-base);border:1px solid var(--border-default);
  border-radius:var(--radius-sm);padding:.625rem .75rem;min-height:6rem;resize:vertical;
  font-family:var(--font-body);font-size:var(--text-body-sm);line-height:1.5;
  color:var(--text-primary);transition:var(--transition-control);
}
.dby-textarea--mono{font-family:var(--font-mono);letter-spacing:var(--tracking-tight);}
.dby-textarea::placeholder{color:var(--text-faint);}
.dby-textarea:not(:disabled):hover{border-color:var(--border-strong);}
.dby-textarea:focus{outline:none;border-color:var(--color-accent);box-shadow:var(--shadow-focus);}
.dby-textarea:disabled{opacity:.55;cursor:not-allowed;background:var(--surface-card);}
.dby-textarea[aria-invalid="true"]{border-color:var(--color-danger);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-textarea-css")) {
  const s = document.createElement("style");
  s.id = "dby-textarea-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Textarea — multi-line input. Default is the body font; set `mono` for
 * code-like content (SQL, PEM keys), matching the app's SQL editor field.
 */
export const Textarea = React.forwardRef(function Textarea(
  { mono = false, invalid = false, className = "", rows = 4, ...rest },
  ref,
) {
  const classes = ["dby-textarea", mono ? "dby-textarea--mono" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={classes}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});
