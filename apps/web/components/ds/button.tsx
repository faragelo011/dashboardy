import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export function Button({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    "dby-btn",
    `dby-btn--${variant}`,
    size !== "md" ? `dby-btn--${size}` : "",
    fullWidth ? "dby-btn--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {leftIcon ? <span className="dby-btn__icon">{leftIcon}</span> : null}
      {children}
      {rightIcon ? <span className="dby-btn__icon">{rightIcon}</span> : null}
    </button>
  );
}
