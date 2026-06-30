"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "./theme-toggle";

type Props = {
  /** Hide ad hoc query link for non-authoring roles and unsigned contexts. */
  showRunQuery: boolean;
  /** Show collections/questions for internal members (including read-only viewers). */
  showSavedQuestions: boolean;
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

const runQueryItem = { href: "/query-run", label: "Run query" } as const;

export function AdminLuxuryNavClient({ showRunQuery, showSavedQuestions }: Props) {
  const pathname = usePathname();
  const items = [
    ...coreItems,
    ...(showSavedQuestions ? savedQuestionItems : []),
    ...(showRunQuery ? [runQueryItem] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border-1 bg-surface-app/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3.5 sm:px-8">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-ink-strong transition-colors hover:text-accent"
        >
          Dashboardy
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <nav
            className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5"
            aria-label="Workspace"
          >
            {items.map(({ href, label }) => {
              const active =
                href === "/"
                  ? pathname === "/" || pathname === ""
                  : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-[4px] px-2.5 py-1.5 text-xs font-medium tracking-tight transition-colors ${
                    active
                      ? "bg-surface-2 text-ink-strong"
                      : "text-ink-muted hover:bg-surface-1 hover:text-ink"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <span
            className="hidden h-5 w-px shrink-0 bg-border-2 sm:block"
            aria-hidden
          />
          <ThemeToggle />
          <form action="/sign-out" method="post" className="shrink-0">
            <button
              type="submit"
              className="inline-flex h-8 items-center justify-center rounded-[4px] border border-border-2 bg-surface-1 px-2.5 text-xs font-medium text-ink-muted transition-colors hover:border-border-3 hover:bg-surface-2 hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
