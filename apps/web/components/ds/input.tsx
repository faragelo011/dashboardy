import type { InputHTMLAttributes } from "react";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: "sm" | "md";
  mono?: boolean;
};

export function Input({
  size = "md",
  mono = false,
  className = "",
  ...rest
}: InputProps) {
  const classes = [
    "dby-input",
    size === "sm" ? "dby-input--sm" : "",
    mono ? "dby-input--mono" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <input className={classes} {...rest} />;
}
