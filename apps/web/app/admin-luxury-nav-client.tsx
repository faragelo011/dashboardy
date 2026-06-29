"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0B0F19]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-8">
        <Link
          href="/"
          className="font-serif text-lg font-light tracking-tight text-white transition-colors hover:text-[#818CF8]"
        >
          Dashboardy
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2" aria-label="Workspace">
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
                  className={`rounded-sm px-3 py-2 text-[10px] font-medium uppercase tracking-[0.15em] transition-colors sm:px-4 ${
                    active
                      ? "text-[#6366F1] shadow-[inset_0_-1px_0_0_rgba(212,175,55,0.9)]"
                      : "text-[#94A3B8] hover:text-[#818CF8]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <span className="hidden h-4 w-px shrink-0 bg-white/15 sm:block" aria-hidden />
          <form action="/sign-out" method="post" className="shrink-0">
            <button
              type="submit"
              className="rounded-sm border border-white/10 bg-transparent px-3 py-2 text-[10px] font-medium uppercase tracking-[0.15em] text-[#94A3B8] transition-colors hover:border-[#6366F1]/40 hover:text-[#818CF8] sm:px-4"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
