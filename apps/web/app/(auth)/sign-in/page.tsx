"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ds/alert";
import { Button } from "@/components/ds/button";
import { Field } from "@/components/ds/field";
import { Input } from "@/components/ds/input";
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

      router.push("/dashboards");
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
    <main className="dby-signin">
      <section className="dby-signin-form-pane">
        <div className="dby-signin-form-wrap w-full max-w-md">
          <div className="dby-signin-brand">
            <Image
              src="/logo-txt.svg"
              alt="Dashboardy"
              width={123}
              height={14}
              priority
            />
          </div>
          <header className="dby-signin-head">
            <h1 className="dby-signin-title">Welcome back</h1>
            <p className="dby-signin-lead">
              Sign in to your analytics workspace—dashboards, filters, and exports await.
            </p>
          </header>
          <form className="dby-signin-form" onSubmit={onSubmit} aria-busy={loading}>
            <Field label="Email address" htmlFor="email">
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
            <div className="dby-field">
              <div className="dby-signin-pass-row">
                <label className="dby-field__label" htmlFor="password">
                  Password
                </label>
                <a className="dby-signin-forgot" href="#" onClick={(e) => e.preventDefault()}>
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                disabled={loading}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "sign-in-error" : undefined}
              />
            </div>
            {error ? (
              <Alert tone="danger" title="Sign-in failed" id="sign-in-error">
                {error}
              </Alert>
            ) : null}
            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </section>
      <aside className="dby-signin-visual" aria-hidden>
        <div className="dby-signin-visual-inner">
          <div>
            <p className="dby-signin-viz-title">Your analytics workspace awaits</p>
            <p className="dby-signin-viz-copy">
              Governed dashboards, trusted freshness, and clear filter scope—ready when you are.
            </p>
          </div>
          <div className="dby-signin-chart-card">
            <div className="dby-signin-chart-meta">
              <span className="dby-signin-chart-label">Revenue trend</span>
              <span className="dby-signin-chart-value">$248k</span>
            </div>
            <div className="dby-signin-bars">
              <span className="dby-signin-bar" style={{ height: "38%" }} />
              <span className="dby-signin-bar" style={{ height: "52%" }} />
              <span className="dby-signin-bar" style={{ height: "44%" }} />
              <span className="dby-signin-bar" style={{ height: "68%" }} />
              <span className="dby-signin-bar" style={{ height: "61%" }} />
              <span className="dby-signin-bar" style={{ height: "78%" }} />
              <span className="dby-signin-bar" style={{ height: "72%" }} />
              <span className="dby-signin-bar" style={{ height: "88%" }} />
            </div>
          </div>
          <div className="dby-signin-kpi-row">
            <div className="dby-signin-kpi">
              <strong>94%</strong>
              <span>Query cache hits</span>
            </div>
            <div className="dby-signin-kpi">
              <strong>12</strong>
              <span>Live dashboards</span>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
