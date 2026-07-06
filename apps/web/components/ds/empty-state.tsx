import type { HTMLAttributes, ReactNode } from "react";

export type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  icon?: ReactNode;
  kicker?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({
  icon,
  kicker,
  description,
  action,
  className = "",
  children,
  ...rest
}: EmptyStateProps) {
  return (
    <div className={["dby-empty", className].filter(Boolean).join(" ")} {...rest}>
      {icon ? <span className="dby-empty__icon">{icon}</span> : null}
      {kicker ? <p className="dby-empty__kicker">{kicker}</p> : null}
      {description ? <p className="dby-empty__desc">{description}</p> : null}
      {children}
      {action ? <div className="dby-empty__action">{action}</div> : null}
    </div>
  );
}
