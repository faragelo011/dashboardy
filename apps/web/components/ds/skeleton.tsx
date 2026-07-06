import type { HTMLAttributes } from "react";

export type SkeletonProps = HTMLAttributes<HTMLSpanElement> & {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
};

export function Skeleton({
  width,
  height,
  circle = false,
  className = "",
  style,
  ...rest
}: SkeletonProps) {
  const classes = ["dby-skeleton", circle ? "dby-skeleton--circle" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classes}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        ...style,
      }}
      aria-hidden="true"
      {...rest}
    />
  );
}
