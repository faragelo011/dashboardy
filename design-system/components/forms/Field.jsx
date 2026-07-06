import React from "react";

const CSS = `
.dby-field{display:flex;flex-direction:column;gap:.375rem;}
.dby-field__label{
  font-size:var(--text-caption);font-weight:var(--weight-medium);
  letter-spacing:var(--tracking-wide);color:var(--text-primary);
  display:inline-flex;gap:.35em;align-items:baseline;
}
.dby-field__optional{color:var(--text-faint);font-weight:var(--weight-regular);}
.dby-field__help{font-size:var(--text-caption);line-height:1.45;color:var(--text-muted);}
.dby-field__error{font-size:var(--text-caption);line-height:1.45;color:var(--color-danger);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-field-css")) {
  const s = document.createElement("style");
  s.id = "dby-field-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Field — label + control + help/error wrapper. The ubiquitous form row in
 * Dashboardy. If `htmlFor` is given it renders a `<label for>` + `<div>`,
 * otherwise it wraps the control in an implicit `<label>`.
 */
export function Field({
  label,
  htmlFor,
  optional = false,
  hint,
  help,
  error,
  className = "",
  children,
}) {
  const labelNode = label ? (
    <span className="dby-field__label">
      {label}
      {optional ? <span className="dby-field__optional">(optional)</span> : null}
      {hint ? <span className="dby-field__optional">{hint}</span> : null}
    </span>
  ) : null;

  const footer = (
    <>
      {help && !error ? <span className="dby-field__help">{help}</span> : null}
      {error ? (
        <span className="dby-field__error" role="alert">
          {error}
        </span>
      ) : null}
    </>
  );

  const classes = ["dby-field", className].filter(Boolean).join(" ");

  if (htmlFor) {
    return (
      <div className={classes}>
        {label ? (
          <label className="dby-field__label" htmlFor={htmlFor}>
            {label}
            {optional ? <span className="dby-field__optional">(optional)</span> : null}
            {hint ? <span className="dby-field__optional">{hint}</span> : null}
          </label>
        ) : null}
        {children}
        {footer}
      </div>
    );
  }

  return (
    <label className={classes}>
      {labelNode}
      {children}
      {footer}
    </label>
  );
}
