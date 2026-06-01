import { redirect } from "next/navigation";

import { getProtectedMe } from "@/app/(protected)/data";
import { AdminLuxuryNav } from "@/app/admin-luxury-nav";

import { QueryRunForm } from "./query-run-form";

export default async function QueryRunPage() {
  const me = await getProtectedMe();
  const canRunAdhoc =
    me.current_workspace.role === "admin" || me.current_workspace.role === "analyst";
  if (!canRunAdhoc) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#06080A] text-[#F0F2F5] font-sans selection:bg-[#D4AF37]/30 selection:text-[#D4AF37]">
      <AdminLuxuryNav />
      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-12 sm:px-8 lg:py-24 animate-fade-in">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-12 max-w-3xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#D4AF37]">
            Query engine
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-white tracking-tight font-light leading-none">
            Ad hoc run
          </h1>
          <p className="text-sm text-[#A0AAB2] font-light leading-relaxed max-w-[60ch]">
            Runs against the workspace&apos;s active Snowflake connection using your session. Row limits
            and caching follow server policy. Only admins and analysts can use this page.
          </p>
        </header>

        <QueryRunForm />
      </div>
    </div>
  );
}
