import React from "react";

const CSS = `
.dby-kicker{
  font-family:var(--font-body);font-size:var(--text-micro);font-weight:var(--weight-semibold);
  letter-spacing:var(--tracking-kicker);text-transform:uppercase;color:var(--text-muted);
  display:block;
}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-kicker-css")) {
  const s = document.createElement("style");
  s.id = "dby-kicker-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Kicker — the uppercase eyebrow above headings and section labels. Sets the
 * "Technical Dense" rhythm: 11px, 600, wide tracking, muted.
 */
export function Kicker({ as: Tag = "p", className = "", children, ...rest }) {
  return (
    <Tag className={["dby-kicker", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </Tag>
  );
}
