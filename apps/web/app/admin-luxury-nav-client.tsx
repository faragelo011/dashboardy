"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ds/button";
import { DsIcon } from "@/components/ds/icon";
import { TopNav, type TopNavItem } from "@/components/ds/top-nav";

import { ThemeToggle } from "./theme-toggle";

type Props = {
  showRunQuery: boolean;
  showSavedQuestions: boolean;
  showDashboards: boolean;
};

const coreItems = [
  { href: "/", label: "Home" },
  { href: "/members", label: "Members" },
  { href: "/connections", label: "Connections" },
] as const;

const savedQuestionItems = [
  { href: "/collections", label: "Collections" },
  { href: "/questions", label: "Questions" },
] as const;

const dashboardItem = { href: "/dashboards", label: "Dashboards" } as const;
const runQueryItem = { href: "/query-run", label: "Run query" } as const;

export function AdminLuxuryNavClient({
  showRunQuery,
  showSavedQuestions,
  showDashboards,
}: Props) {
  const pathname = usePathname();
  const navItems = [
    ...coreItems,
    ...(showSavedQuestions ? savedQuestionItems : []),
    ...(showDashboards ? [dashboardItem] : []),
    ...(showRunQuery ? [runQueryItem] : []),
  ];

  const items: TopNavItem[] = navItems.map(({ href, label }) => ({
    href,
    label,
    active:
      href === "/"
        ? pathname === "/" || pathname === ""
        : pathname === href || pathname.startsWith(`${href}/`),
  }));

  return (
    <TopNav
      items={items}
      actions={
        <>
          <ThemeToggle />
          <form action="/sign-out" method="post" className="shrink-0">
            <Button type="submit" variant="secondary" size="sm" leftIcon={<DsIcon icon={LogOut} />}>
              Sign out
            </Button>
          </form>
        </>
      }
    />
  );
}
