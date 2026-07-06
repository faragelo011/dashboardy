import * as React from "react";

/**
 * Checkbox — boolean control with an inline label, tinted with the accent
 * color. Used for "Allow export", "Required" parameter flags, etc.
 */
export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Inline label text (or pass children). */
  label?: React.ReactNode;
  children?: React.ReactNode;
}

export declare const Checkbox: React.ForwardRefExoticComponent<
  CheckboxProps & React.RefAttributes<HTMLInputElement>
>;
