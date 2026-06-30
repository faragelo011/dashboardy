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
    <main className="flex min-h-dvh items-center justify-center bg-surface-app px-6 py-12">
      <div className="w-full max-w-md">
        <header className="mb-8 flex flex-col items-start gap-2">
          <p className="ds-kicker">Account setup</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-strong sm:text-3xl">
            Set your password
          </h1>
          <p className="ds-help max-w-[40ch]">
            Choose a password to finish activating your account.
          </p>
        </header>

        <div className="ds-card p-6">
          <SetPasswordForm />
        </div>
      </div>
    </main>
  );
}
