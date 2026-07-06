import type { TextareaHTMLAttributes } from "react";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  mono?: boolean;
};

export function Textarea({ mono = false, className = "", ...rest }: TextareaProps) {
  const classes = ["dby-textarea", mono ? "dby-textarea--mono" : "", className]
    .filter(Boolean)
    .join(" ");

  return <textarea className={classes} {...rest} />;
}
