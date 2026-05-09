"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabase } from "@/app/lib/supabase-browser";

const fieldBoxyClass =
  "w-full bg-[#0B0F15] border border-white/10 px-4 py-3 text-[#F0F2F5] text-sm focus:outline-none focus:border-[#D4AF37]/50 focus:bg-[#12161E] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all rounded-sm placeholder:text-[#5C6A7A] disabled:opacity-50 disabled:cursor-not-allowed font-light tracking-wide";

const primaryButtonClass =
  "w-full bg-[#D4AF37] text-black px-6 py-4 text-[11px] uppercase tracking-[0.15em] font-medium hover:bg-[#FBE398] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center mt-4";

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
            const code =
              parsed.error_code ?? detailCode;
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
    <main className="min-h-dvh bg-[#06080A] text-[#F0F2F5] font-sans selection:bg-[#D4AF37]/30 selection:text-[#D4AF37] flex items-center justify-center relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mr-40 -mt-20 w-[600px] h-[600px] bg-[#D4AF37] opacity-[0.02] blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 left-0 -ml-40 -mb-20 w-[400px] h-[400px] bg-[#FBE398] opacity-[0.015] blur-[100px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md px-6 py-12 relative z-10 animate-fade-in-up">
        
        <header className="mb-10 text-center flex flex-col items-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#D4AF37] mb-4">
            Authorized Personnel Only
          </p>
          <h1 className="text-4xl sm:text-5xl font-serif text-white tracking-tight font-light mb-4">
            Sign In
          </h1>
          <p className="text-sm text-[#A0AAB2] font-light max-w-[35ch] mx-auto leading-relaxed">
            Please authenticate using your designated corporate workspace credentials.
          </p>
        </header>

        <form
          className="flex flex-col gap-6 bg-[#0B0F15] p-8 sm:p-10 border border-white/5 shadow-2xl relative"
          onSubmit={onSubmit}
          aria-busy={loading}
        >
          {/* Form decorative accent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />

          <div className="flex flex-col gap-2 relative group/input">
            <label
              htmlFor="email"
              className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors"
            >
              Identity (Email)
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              className={fieldBoxyClass}
              placeholder="e.g. executive@company.com"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-2 relative group/input">
            <label
              htmlFor="password"
              className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={`${fieldBoxyClass} placeholder:font-sans`}
              placeholder="Enter your private password..."
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
              className="border-l-2 border-[#EF4444] bg-[#EF4444]/5 p-4 text-[12px] text-[#A0AAB2] font-mono leading-relaxed"
            >
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#EF4444] mb-1 font-semibold">Verification Failed</div>
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className={primaryButtonClass}
          >
            {loading ? "Authenticating..." : "Log In"}
          </button>
        </form>

        <p className="mt-12 text-center text-[10px] uppercase tracking-[0.1em] text-[#5C6A7A]">
          Security Policy: Zero-Trust Ecosystem
        </p>
      </div>
    </main>
  );
}
