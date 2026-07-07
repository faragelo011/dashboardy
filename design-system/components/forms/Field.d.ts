import * as React from "react";

/**
 * Field — form row wrapper: label (with optional / hint affixes) + control +
 * help or error text. The default composition unit for every Dashboardy form.
 */
export interface FieldProps {
  /** Field label text. */
  label?: React.ReactNode;
  /** If set, associates a `<label for>` with this control id (renders a `<div>` wrapper). Omit to use an implicit wrapping `<label>`. */
  htmlFor?: string;
  /** Append a faint "(optional)" affix to the label. */
  optional?: boolean;
  /** Faint inline hint after the label (e.g. "(if encrypted)"). */
  hint?: React.ReactNode;
  /** Muted helper text under the control. */
  help?: React.ReactNode;
  /** Error text under the control (replaces help, adds role="alert"). */
  error?: React.ReactNode;
  className?: string;
  /** The control element (Input, Select, Textarea, …). */
  children?: React.ReactNode;
}

export function Field(props: FieldProps): JSX.Element;
