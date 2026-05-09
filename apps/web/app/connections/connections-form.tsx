"use client";

import { useState } from "react";

import type { DataConnection } from "@dashboardy/types";

import { upsertConnectionAction } from "./actions";

// Use a subtle bounding box style designed for high-end inputs
const fieldClass =
  "w-full bg-[#0B0F15] border border-white/10 px-4 py-3 text-[#F0F2F5] text-sm focus:outline-none focus:border-[#D4AF37]/50 focus:bg-[#12161E] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all rounded-sm placeholder:text-[#5C6A7A] disabled:opacity-50 disabled:cursor-not-allowed tracking-wide font-light";

const primaryButtonClass =
  "bg-[#D4AF37] text-black px-6 py-3 text-[11px] uppercase tracking-[0.15em] font-medium hover:bg-[#FBE398] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center";

export function ConnectionsForm({
  workspaceId,
  connection,
}: {
  workspaceId: string;
  connection: DataConnection | null;
}) {
  const [password, setPassword] = useState("");
  const [privateKeyPem, setPrivateKeyPem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isNotConfigured = connection?.status === "not_configured";

  return (
    <form
      action={upsertConnectionAction}
      className="p-8 sm:p-12 relative overflow-hidden group bg-gradient-to-br from-[#12161E] border border-white/5 shadow-2xl"
      onSubmit={(e) => {
        if (password.length > 0 && privateKeyPem.length > 0) {
          e.preventDefault();
          setError("Please provide either a password or a private key, not both.");
          return;
        }
        setError(null);
        // Clear after the browser captures FormData for the server action.
        setTimeout(() => {
          setPassword("");
          setPrivateKeyPem("");
        }, 0);
      }}
    >
      <div aria-hidden="true" className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-[#D4AF37] opacity-[0.02] blur-3xl pointer-events-none rounded-full" />

      <input type="hidden" name="workspace_id" value={workspaceId} />

      <div className="flex flex-col gap-10 relative z-10">
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-serif text-[#F0F2F5] tracking-wide font-light">
              Datastore Link
            </h2>
            <span className="uppercase tracking-[0.15em] text-[10px] text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1 bg-[#D4AF37]/5">
              Admin Access Built-In
            </span>
          </div>
          <p className="text-sm text-[#A0AAB2] max-w-[55ch] leading-relaxed font-light">
            Set the connection details below. Sensitive credentials submitted here are not displayed after saving to ensure security.
          </p>
        </header>

        <fieldset className="grid gap-8 md:grid-cols-2">
          <label className="flex flex-col gap-3 group/input">
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors">
              Platform Display Name
            </span>
            <input
              name="name"
              required
              className={fieldClass}
              placeholder="e.g. Primary Snowflake"
              defaultValue={connection?.name ?? ""}
            />
          </label>
          <label className="flex flex-col gap-3 group/input">
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors">
              Processing Warehouse
            </span>
            <input
              name="warehouse"
              required
              className={fieldClass}
              placeholder="e.g. COMPUTE_WH"
              defaultValue={connection?.warehouse ?? ""}
            />
          </label>
          <label className="flex flex-col gap-3 group/input">
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors">
              Primary Database
            </span>
            <input
              name="database"
              required
              className={fieldClass}
              placeholder="e.g. ANALYTICS_DB"
              defaultValue={connection?.database ?? ""}
            />
          </label>
          <label className="flex flex-col gap-3 group/input">
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors">
              Schema <span className="opacity-50">(Optional)</span>
            </span>
            <input
              name="schema"
              className={fieldClass}
              placeholder="e.g. PUBLIC"
              defaultValue={connection?.schema ?? ""}
            />
          </label>
        </fieldset>

        <section className="mt-4 pt-8 border-t border-white/5 relative">
          <h3 className="text-xl font-serif text-[#F0F2F5] tracking-wide font-light mb-2">Secure Credentials</h3>
          <p className="text-[11px] leading-5 text-[#A0AAB2] mb-8 font-light max-w-[65ch]">
            Skip these fields to retain existing credentials. Authenticate via standard password OR an encrypted private key PEM (key-pair). Do not populate both simultaneously.
          </p>
          {error && (
            <div className="mb-6 border border-red-500/30 bg-red-500/5 px-4 py-3 text-red-400 text-xs tracking-wide">
              {error}
            </div>
          )}

          <div className="grid gap-8 md:grid-cols-2">
            <label className="flex flex-col gap-3 group/input">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors">
                Tenant Account
              </span>
              <input
                name="account"
                className={fieldClass}
                placeholder="acme.us-east-1"
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-3 group/input">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors">
                Execution Role
              </span>
              <input
                name="role"
                className={fieldClass}
                placeholder="SYSADMIN"
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-3 group/input md:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors">
                Service Username
              </span>
              <input
                name="username"
                className={fieldClass}
                placeholder="service_user"
                autoComplete="off"
              />
            </label>
            
            <div className="md:col-span-2 pt-6 my-2 border-t border-white/5 relative">
              <span className="absolute -top-3 left-0 bg-[#12161E] px-2 text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">Password Auth</span>
            </div>

            <label className="flex flex-col gap-3 group/input md:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors">
                Vault Password
              </span>
              <input
                name="password"
                type="password"
                value={password}
                onChange={(event) => {
                  if (privateKeyPem.length === 0) setPassword(event.currentTarget.value);
                }}
                disabled={privateKeyPem.length > 0}
                className={`${fieldClass} placeholder:font-sans`}
                placeholder="Optional for password authentication..."
                autoComplete="new-password"
              />
            </label>

            <div className="md:col-span-2 pt-6 my-2 border-t border-white/5 relative">
              <span className="absolute -top-3 left-0 bg-[#12161E] px-2 text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">Key-Pair Auth</span>
            </div>

            <label className="flex flex-col gap-3 group/input md:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors">
                Private Key Payload (PEM)
              </span>
              <textarea
                name="private_key_pem"
                value={privateKeyPem}
                onChange={(event) => {
                  if (password.length === 0) setPrivateKeyPem(event.currentTarget.value);
                }}
                disabled={password.length > 0}
                rows={6}
                className={`${fieldClass} font-mono placeholder:font-sans text-[11px] leading-relaxed resize-none`}
                placeholder="— BEGIN PRIVATE KEY —\n..."
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-3 group/input md:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors">
                PEM Passphrase <span className="opacity-50">(If Encrypted)</span>
              </span>
              <input
                name="private_key_passphrase"
                type="password"
                className={`${fieldClass} placeholder:font-sans`}
                placeholder="Decryption key..."
                autoComplete="new-password"
              />
            </label>
          </div>
        </section>

        <div className="flex flex-col gap-6 pt-8 mt-2 border-t border-white/5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] leading-6 text-[#5C6A7A] max-w-[45ch] uppercase tracking-[0.05em] font-medium">
            {isNotConfigured
              ? "Not configured yet. Submit credentials to move to pending test."
              : "Saved metadata is shown above. Submit credentials again to rotate later (Phase 5)."}
          </p>
          <button className={primaryButtonClass}>Secure Configuration</button>
        </div>
      </div>
    </form>
  );
}
