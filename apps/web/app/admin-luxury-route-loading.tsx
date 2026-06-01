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
      className={`animate-pulse rounded-sm bg-white/[0.06] ${className ?? ""}`}
      aria-hidden
    />
  );
}

export async function AdminLuxuryRouteLoading({ kicker, title, subtitle }: Props) {
  const me = await getProtectedMe();
  const showRunQuery =
    me.current_workspace.role === "admin" || me.current_workspace.role === "analyst";

  return (
    <div className="min-h-screen bg-[#06080A] text-[#F0F2F5] font-sans selection:bg-[#D4AF37]/30 selection:text-[#D4AF37]">
      <AdminLuxuryNavClient showRunQuery={showRunQuery} />
      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-12 sm:px-8 lg:py-24 animate-fade-in">
        <header className="flex flex-col gap-12 border-b border-white/10 pb-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-6">
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#D4AF37]">
              {kicker}
            </p>
            <div className="space-y-4">
              <h1 className="font-serif text-5xl font-light leading-none tracking-tight text-white lg:text-7xl">
                {title}
              </h1>
              <p className="max-w-[55ch] text-sm font-light leading-relaxed text-[#A0AAB2] lg:text-base">
                {subtitle}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 pt-8 lg:items-end lg:pt-0">
            <SkeletonBlock className="h-8 w-28" />
            <SkeletonBlock className="h-4 w-40" />
          </div>
        </header>

        <section className="grid animate-fade-in-up gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-24">
          <div className="flex flex-col gap-8">
            <SkeletonBlock className="h-64 w-full border border-white/5 bg-[#0B0F15]" />
            <SkeletonBlock className="h-48 w-full border border-white/5 bg-[#0B0F15]" />
            <SkeletonBlock className="h-40 w-full border border-white/5 bg-[#0B0F15]" />
          </div>
          <aside className="relative flex flex-col justify-start px-2 py-8 lg:py-12">
            <div
              className="pointer-events-none absolute left-[-48px] top-4 hidden h-[calc(100%-2rem)] w-px bg-gradient-to-b from-transparent via-white/10 to-transparent lg:block"
              aria-hidden
            />
            <SkeletonBlock className="mb-10 h-8 w-48" />
            <div className="space-y-6">
              <SkeletonBlock className="h-4 w-full max-w-[12rem]" />
              <SkeletonBlock className="h-4 w-full max-w-[10rem]" />
              <SkeletonBlock className="h-4 w-full max-w-[14rem]" />
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
