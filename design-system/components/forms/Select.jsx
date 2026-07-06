import React from "react";

const CHEVRON =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23808896' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>";

const CSS = `
.dby-select{
  width:100%;background:var(--surface-base);border:1px solid var(--border-default);
  border-radius:var(--radius-sm);padding:.5625rem 2.25rem .5625rem .75rem;
  font-family:var(--font-body);font-size:var(--text-body-sm);line-height:1.4;
  color:var(--text-primary);transition:var(--transition-control);cursor:pointer;
  -webkit-appearance:none;-moz-appearance:none;appearance:none;
  background-image:url("${CHEVRON}");background-repeat:no-repeat;
  background-position:right .7rem center;background-size:16px 16px;
}
.dby-select:not(:disabled):hover{border-color:var(--border-strong);}
.dby-select:focus{outline:none;border-color:var(--color-accent);box-shadow:var(--shadow-focus);}
.dby-select:disabled{opacity:.55;cursor:not-allowed;background-color:var(--surface-card);}
.dby-select--sm{padding:.375rem 1.75rem .375rem .5rem;font-size:var(--text-caption);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-select-css")) {
  const s = document.createElement("style");
  s.id = "dby-select-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Select — native dropdown styled to match `.ds-select`. Provide either an
 * `options` array or `<option>` children.
 */
export const Select = React.forwardRef(function Select(
  { options, size = "md", className = "", children, ...rest },
  ref,
) {
  const classes = ["dby-select", size === "sm" ? "dby-select--sm" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <select ref={ref} className={classes} {...rest}>
      {options
        ? options.map((o) => {
            const opt = typeof o === "string" ? { value: o, label: o } : o;
            return (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            );
          })
        : children}
    </select>
  );
});
