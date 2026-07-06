import type { ButtonHTMLAttributes, ReactNode } from "react";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost";
  size?: "sm" | "md";
};

export function IconButton({
  variant = "default",
  size = "md",
  className = "",
  type = "button",
  children,
  ...rest
}: IconButtonProps) {
  const classes = [
    "dby-iconbtn",
    variant === "ghost" ? "dby-iconbtn--ghost" : "",
    size === "sm" ? "dby-iconbtn--sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
