import { forwardRef, type ReactNode, type SelectHTMLAttributes } from "react";

export type SelectOption =
  | string
  | { value: string; label: string; disabled?: boolean };

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  options?: SelectOption[];
  size?: "sm" | "md";
  children?: ReactNode;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
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
