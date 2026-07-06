import React from "react";

const CSS = `
.dby-iconbtn{
  display:inline-flex;align-items:center;justify-content:center;
  height:var(--control-height-sm);width:var(--control-height-sm);flex:0 0 auto;
  border-radius:var(--radius-sm);border:1px solid var(--border-default);
  background:var(--surface-base);color:var(--text-muted);cursor:pointer;
  transition:var(--transition-control);padding:0;box-shadow:var(--shadow-xs);
}
.dby-iconbtn:not(:disabled):hover{border-color:var(--border-strong);background:var(--surface-raised);color:var(--text-primary);}
.dby-iconbtn:focus-visible{outline:none;box-shadow:var(--shadow-focus);}
.dby-iconbtn:disabled{opacity:.5;cursor:not-allowed;}
.dby-iconbtn--ghost{border-color:transparent;background:transparent;}
.dby-iconbtn--ghost:not(:disabled):hover{background:var(--surface-card);border-color:transparent;}
.dby-iconbtn--sm{height:1.75rem;width:1.75rem;}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-iconbtn-css")) {
  const s = document.createElement("style");
  s.id = "dby-iconbtn-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * IconButton — a square, icon-only control (theme toggle, row actions,
 * toolbar). Pass a 15px stroke-2 icon (Lucide) as children.
 */
export function IconButton({
  variant = "default",
  size = "md",
  className = "",
  type = "button",
  children,
  ...rest
}) {
  const classes = [
    "dby-iconbtn",
    variant === "ghost" ? "dby-iconbtn--ghost" : "",
    size === "sm" ? "dby-iconbtn--sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
