import type { LucideIcon, LucideProps } from "lucide-react";

/** Signal icon sizes: 15px inline, 16px control-adjacent, 20px standalone. */
export const ICON_SIZE = {
  inline: 15,
  sm: 16,
  md: 20,
} as const;

export type IconSize = keyof typeof ICON_SIZE;

export function iconProps(
  size: IconSize | number = "inline",
): Pick<LucideProps, "size" | "strokeWidth" | "aria-hidden"> {
  return {
    size: typeof size === "number" ? size : ICON_SIZE[size],
    strokeWidth: 2,
    "aria-hidden": true,
  };
}

export type DsIconProps = {
  icon: LucideIcon;
  size?: IconSize | number;
} & Omit<LucideProps, "size" | "strokeWidth">;

/** Renders a Lucide icon at Signal spec (stroke 2, currentColor). */
export function DsIcon({ icon: Icon, size = "inline", className, ...rest }: DsIconProps) {
  return <Icon {...iconProps(size)} className={className} {...rest} />;
}
