"use client";

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
          <p className="dby-signin-brand">Dashboardy</p>
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
        <div className="dby-signin-visual-glow" />
        <div className="dby-signin-visual-inner">
          <p className="dby-signin-viz-kicker">Product preview</p>
          <p className="dby-signin-viz-title">Governed analytics, ready to read</p>
          <p className="dby-signin-viz-copy">
            Trusted freshness, clear filter scope, and dashboards built from reusable questions.
          </p>

          <div className="dby-signin-mock">
            <div className="dby-signin-mock-chrome">
              <span className="dby-signin-mock-dot" />
              <span className="dby-signin-mock-dot" />
              <span className="dby-signin-mock-dot" />
              <span className="dby-signin-mock-title">Revenue Overview</span>
            </div>
            <div className="dby-signin-mock-body">
              <div className="dby-signin-mock-filters">
                <span className="dby-signin-mock-chip">Region · EMEA</span>
                <span className="dby-signin-mock-chip">Q2 2026</span>
                <span className="dby-signin-mock-chip dby-signin-mock-chip--accent">Fresh · 4m</span>
              </div>
              <div className="dby-signin-mock-grid">
                <div className="dby-signin-mock-kpi">
                  <span className="dby-signin-mock-kpi-label">ARR</span>
                  <strong className="dby-signin-mock-kpi-value">$248k</strong>
                  <span className="dby-signin-mock-kpi-delta">+12.4%</span>
                </div>
                <div className="dby-signin-mock-kpi">
                  <span className="dby-signin-mock-kpi-label">Active seats</span>
                  <strong className="dby-signin-mock-kpi-value">1,284</strong>
                  <span className="dby-signin-mock-kpi-delta">+3.1%</span>
                </div>
                <div className="dby-signin-chart-card">
                  <div className="dby-signin-chart-meta">
                    <span className="dby-signin-chart-label">Weekly revenue</span>
                    <span className="dby-signin-chart-value">Trend</span>
                  </div>
                  <div className="dby-signin-bars" role="presentation">
                    <span className="dby-signin-bar" style={{ height: "34%" }} />
                    <span className="dby-signin-bar" style={{ height: "48%" }} />
                    <span className="dby-signin-bar" style={{ height: "42%" }} />
                    <span className="dby-signin-bar" style={{ height: "61%" }} />
                    <span className="dby-signin-bar" style={{ height: "55%" }} />
                    <span className="dby-signin-bar" style={{ height: "74%" }} />
                    <span className="dby-signin-bar" style={{ height: "68%" }} />
                    <span className="dby-signin-bar" style={{ height: "86%" }} />
                    <span className="dby-signin-bar" style={{ height: "79%" }} />
                    <span className="dby-signin-bar" style={{ height: "92%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
