import {
  Database,
  FileQuestion,
  Folder,
  LayoutDashboard,
  LayoutGrid,
  Terminal,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Lucide glyphs for workspace top-nav routes (Signal brand-icons.card). */
export const NAV_ICON_BY_HREF: Record<string, LucideIcon> = {
  "/": LayoutDashboard,
  "/members": Users,
  "/connections": Database,
  "/collections": Folder,
  "/questions": FileQuestion,
  "/dashboards": LayoutGrid,
  "/query-run": Terminal,
};

export function navIconForHref(href: string): LucideIcon | undefined {
  return NAV_ICON_BY_HREF[href];
}
