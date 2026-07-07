import type { HTMLAttributes, ReactNode } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "inset" | "dashed";
  padding?: "none" | "sm" | "md" | "lg";
  title?: ReactNode;
  headerAction?: ReactNode;
};

export function Card({
  variant = "default",
  padding = "md",
  title,
  headerAction,
  className = "",
  children,
  ...rest
}: CardProps) {
  const classes = [
    "dby-card",
    variant === "inset" ? "dby-card--inset" : "",
    variant === "dashed" ? "dby-card--dashed" : "",
    padding === "sm" ? "dby-card--pad-sm" : "",
    padding === "md" ? "dby-card--pad-md" : "",
    padding === "lg" ? "dby-card--pad-lg" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...rest}>
      {title || headerAction ? (
        <div className="dby-card__head">
          {title ? <h2 className="dby-card__title">{title}</h2> : <span />}
          {headerAction}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function Kicker({ className = "", ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={["dby-kicker", className].filter(Boolean).join(" ")} {...rest} />;
}

export function Divider({ className = "", ...rest }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={["dby-divider", className].filter(Boolean).join(" ")} {...rest} />;
}

export type StatProps = HTMLAttributes<HTMLDivElement> & {
  label?: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  size?: "default" | "sm";
};

export function Stat({ label, value, hint, size = "default", className = "", ...rest }: StatProps) {
  return (
    <div className={["dby-stat", className].filter(Boolean).join(" ")} {...rest}>
      {label ? <span className="dby-stat__label">{label}</span> : null}
      <span
        className={["dby-stat__value", size === "sm" ? "dby-stat__value--sm" : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </span>
      {hint ? <span className="dby-stat__hint">{hint}</span> : null}
    </div>
  );
}
