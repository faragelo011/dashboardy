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
    <main className="min-h-dvh bg-surface-app text-ink">
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Access control
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-strong">
            Set your password
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Choose a password to finish setting up your account.
          </p>
        </div>

        <SetPasswordForm />
      </div>
    </main>
  );
}

