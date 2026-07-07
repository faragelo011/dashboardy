import React from "react";

const CSS = `
.dby-skeleton{
  display:block;background:var(--surface-raised);border-radius:var(--radius-sm);
  animation:dby-pulse 1.5s var(--ease-in-out) infinite;
}
.dby-skeleton--circle{border-radius:var(--radius-full);}
@media (prefers-reduced-motion: reduce){ .dby-skeleton{animation:none;} }
`;
if (typeof document !== "undefined" && !document.getElementById("dby-skeleton-css")) {
  const s = document.createElement("style");
  s.id = "dby-skeleton-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Skeleton — a pulsing placeholder block for loading states (shell, per-widget,
 * table rows). Mirrors the app's `animate-pulse rounded bg-surface-2`. Respects
 * reduced-motion. Give it a `width`/`height` (number = px, or any CSS length).
 */
export function Skeleton({
  width = "100%",
  height = "1rem",
  circle = false,
  radius,
  className = "",
  style = {},
  ...rest
}) {
  const classes = ["dby-skeleton", circle ? "dby-skeleton--circle" : "", className]
    .filter(Boolean)
    .join(" ");
  const px = (v) => (typeof v === "number" ? `${v}px` : v);
  return (
    <span
      className={classes}
      aria-hidden="true"
      style={{ width: px(width), height: px(height), borderRadius: radius ? px(radius) : undefined, ...style }}
      {...rest}
    />
  );
}
