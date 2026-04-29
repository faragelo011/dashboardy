"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabase } from "@/app/lib/supabase-browser";

export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedPassword = password.trim();
    const trimmedConfirm = confirm.trim();
    if (!trimmedPassword) {
      setError("Password is required.");
      return;
    }
    if (!trimmedConfirm) {
      setError("Confirm password is required.");
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const { error: err } = await supabase.auth.updateUser({
        password: trimmedPassword,
      });
      if (err) {
        setError(err.message);
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-ink">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className="h-11 w-full rounded-xl border border-border-0 bg-surface-1 px-3 text-sm text-ink shadow-sm outline-none transition-colors placeholder:text-ink-faint focus:border-focus focus:ring-4 focus:ring-focus-ring/30 disabled:cursor-not-allowed disabled:bg-surface-5"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          disabled={loading}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "set-password-error" : undefined}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm" className="text-sm font-medium text-ink">
          Confirm password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          className="h-11 w-full rounded-xl border border-border-0 bg-surface-1 px-3 text-sm text-ink shadow-sm outline-none transition-colors placeholder:text-ink-faint focus:border-focus focus:ring-4 focus:ring-focus-ring/30 disabled:cursor-not-allowed disabled:bg-surface-5"
          value={confirm}
          onChange={(ev) => setConfirm(ev.target.value)}
          disabled={loading}
        />
      </div>

      {error ? (
        <div
          id="set-password-error"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="rounded-xl border border-danger-border bg-danger-soft-strong px-3 py-2 text-sm text-danger-ink-strong"
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 inline-flex h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-surface-3 shadow-sm transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:bg-border-3"
      >
        {loading ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}

