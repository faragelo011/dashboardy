import type { HTMLAttributes, ReactNode } from "react";

import { ALERT_ICON_BY_TONE } from "./alert-icons";
import { DsIcon } from "./icon";

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "info" | "danger" | "success" | "warn";
  title?: ReactNode;
  icon?: ReactNode | false;
};

export function Alert({
  tone = "info",
  title,
  icon,
  className = "",
  children,
  ...rest
}: AlertProps) {
  const classes = ["dby-alert", `dby-alert--${tone}`, className].filter(Boolean).join(" ");

  let iconNode: ReactNode = null;
  if (icon !== false) {
    iconNode =
      icon ?? <DsIcon icon={ALERT_ICON_BY_TONE[tone]} size="sm" className="shrink-0" />;
  }

  return (
    <div className={classes} role="alert" {...rest}>
      {iconNode ? <span className="dby-alert__icon">{iconNode}</span> : null}
      <div className="dby-alert__body">
        {title ? <p className="dby-alert__title">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}
