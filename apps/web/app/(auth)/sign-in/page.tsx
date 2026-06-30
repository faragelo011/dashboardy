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

      // After provisioning, `/me` returns 403 password_reset_required until the user resets.
      // This client-side check avoids relying on server-side redirects that may be opaque during debugging.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiBase =
        process.env.NEXT_PUBLIC_API_PUBLIC_URL ?? process.env.API_PUBLIC_URL ?? "";
      if (token && apiBase) {
        const meRes = await fetch(`${apiBase.replace(/\/$/, "")}/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }).catch(() => null);
        if (meRes?.status === 403) {
          const bodyText = await meRes.text().catch(() => "");
          try {
            const parsed = JSON.parse(bodyText) as {
              error_code?: unknown;
              detail?: { error_code?: unknown } | unknown;
            };
            const detailCode =
              parsed.detail && typeof parsed.detail === "object"
                ? "error_code" in parsed.detail
                  ? (parsed.detail as { error_code?: unknown }).error_code
                  : undefined
                : undefined;
            const code = parsed.error_code ?? detailCode;
            if (code === "password_reset_required") {
              router.push("/set-password");
              router.refresh();
              return;
            }
          } catch {
            // ignore parse failures
          }
        }
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
    <main className="flex min-h-dvh items-center justify-center bg-surface-app px-6 py-12">
      <div className="w-full max-w-md">
        <header className="mb-8 flex flex-col items-start gap-2">
          <p className="ds-kicker">Authorized access</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-strong sm:text-3xl">
            Sign in
          </h1>
          <p className="ds-help max-w-[40ch]">
            Sign in with your workspace credentials.
          </p>
        </header>

        <form
          className="ds-card flex flex-col gap-5 p-6"
          onSubmit={onSubmit}
          aria-busy={loading}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="ds-label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              className="ds-input"
              placeholder="you@company.com"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="ds-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="ds-input"
              placeholder="Enter password"
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
              className="ds-alert ds-alert--danger"
            >
              <div className="flex flex-col gap-1">
                <span className="font-semibold">Sign-in failed</span>
                <span>{error}</span>
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="ds-btn ds-btn-primary w-full"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
