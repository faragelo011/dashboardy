import React from "react";

const CSS = `
.dby-pagehead{display:flex;flex-direction:column;gap:.75rem;}
.dby-pagehead--bordered{border-bottom:1px solid var(--border-subtle);padding-bottom:2rem;}
.dby-pagehead__top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:1rem;}
.dby-pagehead__main{display:flex;flex-direction:column;gap:.5rem;max-width:60ch;}
.dby-pagehead__title{font-family:var(--font-display);font-size:var(--text-h1);font-weight:var(--weight-semibold);
  letter-spacing:var(--tracking-tight);line-height:1.15;color:var(--text-strong);}
.dby-pagehead__desc{font-size:var(--text-body);line-height:1.6;color:var(--text-muted);}
.dby-pagehead__actions{display:flex;flex-wrap:wrap;gap:.5rem;flex-shrink:0;}
@media (min-width:640px){ .dby-pagehead__title{font-size:var(--text-display);} }
`;
if (typeof document !== "undefined" && !document.getElementById("dby-pagehead-css")) {
  const s = document.createElement("style");
  s.id = "dby-pagehead-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * PageHeader — the standard screen header: kicker + title + description, with
 * an optional actions cluster and an above-title slot (workspace badge). Every
 * primary surface opens with this block.
 */
export function PageHeader({
  kicker,
  title,
  description,
  actions,
  above,
  bordered = true,
  className = "",
  ...rest
}) {
  const classes = ["dby-pagehead", bordered ? "dby-pagehead--bordered" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <header className={classes} {...rest}>
      {above ? <div>{above}</div> : null}
      <div className="dby-pagehead__top">
        <div className="dby-pagehead__main">
          {kicker ? <p className="dby-kicker">{kicker}</p> : null}
          {title ? <h1 className="dby-pagehead__title">{title}</h1> : null}
          {description ? <p className="dby-pagehead__desc">{description}</p> : null}
        </div>
        {actions ? <div className="dby-pagehead__actions">{actions}</div> : null}
      </div>
    </header>
  );
}
