import type { HTMLAttributes, ReactNode } from "react";

export type PageHeaderProps = HTMLAttributes<HTMLElement> & {
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  bordered?: boolean;
};

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  bordered = true,
  className = "",
  ...rest
}: PageHeaderProps) {
  return (
    <header
      className={[
        "dby-pagehead",
        bordered ? "dby-pagehead--bordered" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      <div className="dby-pagehead__top">
        <div className="dby-pagehead__main">
          {kicker}
          <h1 className="dby-pagehead__title">{title}</h1>
          {description ? <p className="dby-pagehead__desc">{description}</p> : null}
        </div>
        {actions ? <div className="dby-pagehead__actions">{actions}</div> : null}
      </div>
    </header>
  );
}
