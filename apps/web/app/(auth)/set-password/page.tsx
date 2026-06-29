import { redirect } from "next/navigation";

import { createServerSupabase } from "@/app/lib/supabase-server";

import { SetPasswordForm } from "./set-password-form";

export default async function SetPasswordPage() {
  const currentPath = "/set-password";
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent(currentPath)}`);
  }

  return (
    <main className="min-h-dvh bg-[#0B0F19] text-[#F8FAFC] font-sans selection:bg-[#6366F1]/30 selection:text-[#6366F1] flex items-center justify-center relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mr-40 -mt-20 w-[600px] h-[600px] bg-[#6366F1] opacity-[0.02] blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 left-0 -ml-40 -mb-20 w-[400px] h-[400px] bg-[#818CF8] opacity-[0.015] blur-[100px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md px-6 py-12 relative z-10 animate-fade-in-up">
        
        <header className="mb-10 text-center flex flex-col items-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#6366F1] mb-4">
            Security Initialization
          </p>
          <h1
            aria-label="Set your password"
            className="text-4xl sm:text-5xl font-serif text-white tracking-tight font-light mb-4"
          >
            Set Passcode
          </h1>
          <p className="text-sm text-[#94A3B8] font-light max-w-[35ch] mx-auto leading-relaxed">
            Please define a secure, private passcode to finalize your corporate authorization protocols.
          </p>
        </header>

        <div className="bg-[#111827] p-8 sm:p-10 border border-white/5 shadow-2xl relative">
          {/* Form decorative accent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-px bg-gradient-to-r from-transparent via-[#6366F1]/50 to-transparent" />
          
          <SetPasswordForm />
        </div>

        <p className="mt-12 text-center text-[10px] uppercase tracking-[0.1em] text-[#374151]">
          Security Policy: Zero-Trust Ecosystem
        </p>
      </div>
    </main>
  );
}
