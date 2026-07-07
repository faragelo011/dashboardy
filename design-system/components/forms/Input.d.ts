import * as React from "react";

/**
 * Input — single-line text field. Supports every native input type
 * (text, email, password, number, date, search). Mirrors `.ds-input`.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** `md` (default) or `sm` (compact rows / inline filters). */
  size?: "sm" | "md";
  /** Render in the monospace stack (IDs, tokens, codes). */
  mono?: boolean;
  /** Apply the invalid treatment + `aria-invalid`. */
  invalid?: boolean;
}

export declare const Input: React.ForwardRefExoticComponent<
  InputProps & React.RefAttributes<HTMLInputElement>
>;
