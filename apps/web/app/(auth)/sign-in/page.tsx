"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabase } from "@/app/lib/supabase-browser";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signErr) {
        setError(signErr.message);
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("sign-in failed", err);
      if (err instanceof Error) {
        setError(err.message || String(err));
      } else {
        setError(String(err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-surface-app text-ink">
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Access control
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-strong">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Use your workspace account to continue.
          </p>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={onSubmit}
          aria-busy={loading}
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-ink"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              className="h-11 w-full rounded-xl border border-border-0 bg-surface-1 px-3 text-sm text-ink shadow-sm outline-none transition-colors placeholder:text-ink-faint focus:border-focus focus:ring-4 focus:ring-focus-ring/30 disabled:cursor-not-allowed disabled:bg-surface-5"
              placeholder="name@company.com"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-ink"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="h-11 w-full rounded-xl border border-border-0 bg-surface-1 px-3 text-sm text-ink shadow-sm outline-none transition-colors placeholder:text-ink-faint focus:border-focus focus:ring-4 focus:ring-focus-ring/30 disabled:cursor-not-allowed disabled:bg-surface-5"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              disabled={loading}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "sign-in-error" : undefined}
            />
          </div>

          {error ? (
            <div
              id="sign-in-error"
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
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-xs leading-relaxed text-ink-muted">
          By continuing, you agree to the security policies of your
          organization.
        </p>
      </div>
    </main>
  );
}
