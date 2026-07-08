"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ds/button";
import { DsIcon } from "@/components/ds/icon";
import { TopNav, type TopNavItem } from "@/components/ds/top-nav";

import { ThemeToggle } from "./theme-toggle";

type Props = {
  showSavedQuestions: boolean;
  showDashboards: boolean;
};

const middleItems = [
  { href: "/members", label: "Members" },
  { href: "/connections", label: "Connections" },
] as const;

const savedQuestionItems = [
  { href: "/collections", label: "Collections" },
  { href: "/questions", label: "Questions" },
] as const;

const dashboardItem = { href: "/dashboards", label: "Dashboards" } as const;
const profileItem = { href: "/profile", label: "Profile" } as const;

export function AdminLuxuryNavClient({
  showSavedQuestions,
  showDashboards,
}: Props) {
  const pathname = usePathname();
  const navItems = [
    ...(showDashboards ? [dashboardItem] : []),
    ...middleItems,
    ...(showSavedQuestions ? savedQuestionItems : []),
    profileItem,
  ];

  const items: TopNavItem[] = navItems.map(({ href, label }) => ({
    href,
    label,
    active: pathname === href || pathname.startsWith(`${href}/`),
  }));

  return (
    <TopNav
      brandHref="/dashboards"
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
