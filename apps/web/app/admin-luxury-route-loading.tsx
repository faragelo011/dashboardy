import type { ReactNode } from "react";

import { getProtectedMe } from "@/app/(protected)/data";

import { AdminLuxuryNavClient } from "./admin-luxury-nav-client";

type Props = {
  kicker: string;
  title: ReactNode;
  subtitle: string;
};

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[4px] bg-surface-2 ${className ?? ""}`}
      aria-hidden
    />
  );
}

type ShellProps = Props & {
  showSavedQuestions: boolean;
  showDashboards: boolean;
};

export function AdminLuxuryRouteLoadingShell({
  kicker,
  title,
  subtitle,
  showSavedQuestions,
  showDashboards,
}: ShellProps) {
  return (
    <div className="min-h-screen bg-surface-app text-ink">
      <AdminLuxuryNavClient
        showSavedQuestions={showSavedQuestions}
        showDashboards={showDashboards}
      />
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-8 lg:py-14">
        <header className="flex flex-col gap-6 border-b border-border-1 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="ds-kicker">{kicker}</p>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-ink-strong sm:text-3xl">
              {title}
            </h1>
            <p className="max-w-[60ch] text-sm leading-relaxed text-ink-muted">
              {subtitle}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 pt-4 lg:items-end lg:pt-0">
            <SkeletonBlock className="h-8 w-28" />
            <SkeletonBlock className="h-4 w-40" />
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
          <div className="flex flex-col gap-4">
            <SkeletonBlock className="h-40 w-full border border-border-1" />
            <SkeletonBlock className="h-32 w-full border border-border-1" />
            <SkeletonBlock className="h-28 w-full border border-border-1" />
          </div>
          <aside className="flex flex-col gap-4">
            <SkeletonBlock className="h-8 w-48" />
            <SkeletonBlock className="h-4 w-full max-w-[12rem]" />
            <SkeletonBlock className="h-4 w-full max-w-[10rem]" />
            <SkeletonBlock className="h-4 w-full max-w-[14rem]" />
          </aside>
        </section>
      </div>
    </div>
  );
}

export async function AdminLuxuryRouteLoading({ kicker, title, subtitle }: Props) {
  const me = await getProtectedMe();
  const role = me.current_workspace.role;
  const showSavedQuestions =
    role === "admin" || role === "analyst" || role === "viewer";
  const showDashboards =
    role === "admin" || role === "analyst" || role === "viewer";

  return (
    <AdminLuxuryRouteLoadingShell
      kicker={kicker}
      title={title}
      subtitle={subtitle}
      showSavedQuestions={showSavedQuestions}
      showDashboards={showDashboards}
    />
  );
}
