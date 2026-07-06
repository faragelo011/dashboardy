import type { InputHTMLAttributes, ReactNode } from "react";

export type FieldProps = {
  label?: ReactNode;
  htmlFor?: string;
  optional?: boolean;
  help?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function Field({
  label,
  htmlFor,
  optional = false,
  help,
  error,
  className = "",
  children,
}: FieldProps) {
  return (
    <div className={["dby-field", className].filter(Boolean).join(" ")}>
      {label ? (
        <label className="dby-field__label" htmlFor={htmlFor}>
          {label}
          {optional ? <span className="dby-field__optional">(optional)</span> : null}
        </label>
      ) : null}
      {children}
      {help && !error ? <p className="dby-field__help">{help}</p> : null}
      {error ? <p className="dby-field__error">{error}</p> : null}
    </div>
  );
}

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: ReactNode;
};

export function Checkbox({ label, disabled, className = "", ...rest }: CheckboxProps) {
  const classes = [
    "dby-checkbox",
    disabled ? "dby-checkbox--disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={classes}>
      <input type="checkbox" disabled={disabled} {...rest} />
      {label ? <span className="dby-checkbox__text">{label}</span> : null}
    </label>
  );
}
