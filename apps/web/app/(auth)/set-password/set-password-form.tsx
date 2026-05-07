"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { completePasswordReset } from "@/app/lib/api";
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
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Session expired. Please sign in again.");
        return;
      }
      const completeRes = await completePasswordReset(token);
      if (!completeRes.ok) {
        const body = await completeRes.text().catch(() => "");
        setError(body || "Unable to complete password reset.");
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
        <label htmlFor="password" className="text-sm font-medium text-slate-700">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:bg-slate-100"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          disabled={loading}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "set-password-error" : undefined}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm" className="text-sm font-medium text-slate-700">
          Confirm password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:bg-slate-100"
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
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-slate-50 shadow-sm transition-colors hover:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {loading ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}

