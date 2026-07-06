import * as React from "react";

/**
 * Textarea — multi-line text input. Body font by default; `mono` for
 * SQL / PEM / code-like content.
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Render in the monospace stack (SQL editor, private keys). */
  mono?: boolean;
  /** Apply the invalid treatment + `aria-invalid`. */
  invalid?: boolean;
}

export declare const Textarea: React.ForwardRefExoticComponent<
  TextareaProps & React.RefAttributes<HTMLTextAreaElement>
>;
