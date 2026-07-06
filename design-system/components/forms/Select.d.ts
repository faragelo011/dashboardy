import * as React from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Select — native dropdown styled to match `.ds-select` (custom chevron,
 * accent focus ring). Pass `options` or `<option>` children.
 */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Convenience option list; alternatively pass `<option>` children. */
  options?: (SelectOption | string)[];
  /** `md` (default) or `sm` (compact rows / inline filters). */
  size?: "sm" | "md";
}

export declare const Select: React.ForwardRefExoticComponent<
  SelectProps & React.RefAttributes<HTMLSelectElement>
>;
