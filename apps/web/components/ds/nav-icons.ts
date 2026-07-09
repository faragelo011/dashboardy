import {
  Database,
  FileQuestion,
  Folder,
  LayoutGrid,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Lucide glyphs for workspace top-nav routes. */
export const NAV_ICON_BY_HREF: Record<string, LucideIcon> = {
  "/profile": User,
  "/members": Users,
  "/connections": Database,
  "/collections": Folder,
  "/questions": FileQuestion,
  "/dashboards": LayoutGrid,
};

export function navIconForHref(href: string): LucideIcon | undefined {
  return NAV_ICON_BY_HREF[href];
}
