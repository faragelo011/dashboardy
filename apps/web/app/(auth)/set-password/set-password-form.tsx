"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { completePasswordReset } from "@/app/lib/api";
import { createBrowserSupabase } from "@/app/lib/supabase-browser";

const fieldBoxyClass =
  "w-full bg-[#0B0F15] border border-white/10 px-4 py-3 text-[#F0F2F5] text-sm focus:outline-none focus:border-[#D4AF37]/50 focus:bg-[#12161E] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all rounded-sm placeholder:text-[#5C6A7A] disabled:opacity-50 disabled:cursor-not-allowed font-light tracking-wide";

const primaryButtonClass =
  "w-full bg-[#D4AF37] text-black px-6 py-4 text-[11px] uppercase tracking-[0.15em] font-medium hover:bg-[#FBE398] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center mt-4";

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
      setError("Passcode is required.");
      return;
    }
    if (!trimmedConfirm) {
      setError("Passcode confirmation is required.");
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      setError("Passcodes do not match.");
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
        setError(body || "Unable to complete passcode initialization.");
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2 relative group/input">
        <label htmlFor="password" className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors">
          New Passcode
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className={`${fieldBoxyClass} placeholder:font-sans`}
          placeholder="Highly secure passcode..."
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          disabled={loading}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "set-password-error" : undefined}
        />
      </div>

      <div className="flex flex-col gap-2 relative group/input">
        <label htmlFor="confirm" className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors">
          Verify Passcode
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          className={`${fieldBoxyClass} placeholder:font-sans`}
          placeholder="Repeat secure passcode..."
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
          className="border-l-2 border-[#EF4444] bg-[#EF4444]/5 p-4 text-[12px] text-[#A0AAB2] font-mono leading-relaxed"
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#EF4444] mb-1 font-semibold">Validation Error</div>
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className={primaryButtonClass}
      >
        {loading ? "Encrypting..." : "Commit Initialization"}
      </button>
    </form>
  );
}
