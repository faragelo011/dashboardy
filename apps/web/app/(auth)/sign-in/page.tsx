"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

import { Alert } from "@/components/ds/alert";
import { Button } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { Field } from "@/components/ds/field";
import { Input } from "@/components/ds/input";
import { Kicker } from "@/components/ds/card";
import { DsIcon } from "@/components/ds/icon";
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
    <main
      className="relative flex min-h-dvh items-center justify-center px-6 py-12"
      style={{ background: "var(--surface-canvas)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{ background: "var(--gradient-brand-soft)" }}
      />
      <div className="relative w-full max-w-md">
        <header className="mb-8 flex flex-col items-start gap-2">
          <Kicker>Authorized access</Kicker>
          <h1 className="font-display text-[var(--text-display)] font-semibold tracking-tight text-ink-strong">
            Sign in
          </h1>
          <p className="dby-field__help max-w-[40ch]">
            Sign in with your workspace credentials.
          </p>
        </header>

        <Card padding="md" className="flex flex-col gap-5">
          <form className="flex flex-col gap-5" onSubmit={onSubmit} aria-busy={loading}>
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="you@company.com"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                disabled={loading}
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                disabled={loading}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "sign-in-error" : undefined}
              />
            </Field>

            {error ? (
              <Alert tone="danger" title="Sign-in failed" id="sign-in-error">
                {error}
              </Alert>
            ) : null}

            <Button type="submit" variant="primary" fullWidth disabled={loading} leftIcon={<DsIcon icon={LogIn} />}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
