import React from "react";

const CSS = `
.dby-divider{border:0;border-top:1px solid var(--border-subtle);height:0;margin:0;}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-divider-css")) {
  const s = document.createElement("style");
  s.id = "dby-divider-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Divider — a hairline rule (matches `.ds-divider`). Separates sections
 * inside cards and forms.
 */
export function Divider({ className = "", ...rest }) {
  return <hr className={["dby-divider", className].filter(Boolean).join(" ")} {...rest} />;
}
