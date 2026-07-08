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
      setError("Password confirmation is required.");
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
        setError(body || "Unable to complete password setup.");
        return;
      }

      router.push("/dashboards");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="ds-label">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className="ds-input"
          placeholder="Enter new password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          disabled={loading}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "set-password-error" : undefined}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm" className="ds-label">
          Confirm password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          className="ds-input"
          placeholder="Repeat new password"
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
          className="ds-alert ds-alert--danger"
        >
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Could not set password</span>
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="ds-btn ds-btn-primary w-full"
      >
        {loading ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}
