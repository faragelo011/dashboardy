import type { HTMLAttributes } from "react";

export type WorkspaceBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  label?: string;
  name: string;
};

export function WorkspaceBadge({
  label = "Workspace",
  name,
  className = "",
  ...rest
}: WorkspaceBadgeProps) {
  return (
    <span className={["dby-wsbadge", className].filter(Boolean).join(" ")} {...rest}>
      <span className="dby-wsbadge__label">{label}</span>
      <span className="dby-wsbadge__name">{name}</span>
    </span>
  );
}
