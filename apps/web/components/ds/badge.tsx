import type { HTMLAttributes, ReactNode } from "react";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "ok" | "warn" | "danger" | "info" | "idle";
  dot?: boolean;
};

export function Badge({
  tone = "neutral",
  dot = true,
  className = "",
  children,
  ...rest
}: BadgeProps) {
  const classes = [
    "dby-badge",
    tone !== "neutral" ? `dby-badge--${tone}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...rest}>
      {dot ? <span className="dby-badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
