import { redirect } from "next/navigation";

import { createServerSupabase } from "@/app/lib/supabase-server";

import { SetPasswordForm } from "./set-password-form";

export default async function SetPasswordPage() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-dvh bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-600">
            Dashboardy
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Set your password
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Choose a password to finish setting up your account.
          </p>
        </div>

        <SetPasswordForm />
      </div>
    </main>
  );
}

