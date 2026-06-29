"use client";

import { useRef, useState, useTransition } from "react";

import { provisionMemberAction } from "./actions";

type Props = {
  workspaceId: string;
  fieldClass: string;
  primaryButtonClass: string;
  roleOptions: readonly (readonly [string, string, string])[];
};

export function ProvisionMemberForm({
  workspaceId,
  fieldClass,
  primaryButtonClass,
  roleOptions,
}: Props) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="p-8 sm:p-12 relative overflow-hidden group bg-gradient-to-br from-[#1F2937] inline-block border-[0.5px] border-white/10"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const form = formRef.current;
        if (!form) return;
        const fd = new FormData(form);
        startTransition(async () => {
          try {
            await provisionMemberAction(fd);
            form.reset();
          } catch (err) {
            if (err instanceof Error) setError(err.message);
            else setError(String(err));
          }
        });
      }}
    >
      <input type="hidden" name="workspace_id" value={workspaceId} />

      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-2 relative z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-serif text-[#F8FAFC] tracking-wide font-light">
              Invite
            </h2>
            <span className="uppercase tracking-[0.15em] text-[10px] text-[#6366F1] border border-[#6366F1]/30 px-3 py-1 bg-[#6366F1]/5">
              Admin Access Built-In
            </span>
          </div>
          <p className="text-sm text-[#94A3B8] max-w-[50ch] leading-relaxed font-light">
            Grant secure workspace access directly. An initial credential will be created and mandated for reset upon entry.
          </p>
        </header>

        <div className="grid gap-12 lg:grid-cols-2 relative z-10">
          <label className="flex flex-col gap-3 group/input">
            <span className="text-[11px] uppercase tracking-[0.1em] text-[#374151] group-focus-within/input:text-[#6366F1] transition-colors">
              Email Address
            </span>
            <input
              name="email"
              type="email"
              required
              className={fieldClass}
              placeholder="e.g. executive@company.com"
              disabled={isPending}
            />
          </label>

          <label className="flex flex-col gap-3 group/input">
            <span className="text-[11px] uppercase tracking-[0.1em] text-[#374151] group-focus-within/input:text-[#6366F1] transition-colors">
              Access Tier
            </span>
            <select
              name="role"
              className={fieldClass}
              defaultValue="viewer"
              disabled={isPending}
            >
              {roleOptions.map(([value, label]) => (
                <option key={value} value={value} className="bg-[#111827] text-[#F8FAFC]">
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-3 lg:col-span-2 group/input">
            <span className="text-[11px] uppercase tracking-[0.1em] text-[#374151] group-focus-within/input:text-[#6366F1] transition-colors">
              Temporary Credential
            </span>
            <input
              name="initial_password"
              type="password"
              required
              minLength={8}
              className={fieldClass}
              placeholder="Required: minimum 8 characters"
              autoComplete="new-password"
              disabled={isPending}
            />
          </label>
        </div>

        {error ? (
          <div
            role="alert"
            className="border-l-2 border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-200 font-light relative z-10"
          >
            {error}
          </div>
        ) : null}

        <div className="pt-8 border-t border-white/5 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <p className="text-[11px] leading-5 text-[#374151] uppercase tracking-[0.05em]">
            Access can be revoked from the roster.
          </p>
          <button className={primaryButtonClass} disabled={isPending}>
            {isPending ? "Connecting..." : "Provision Access"}
          </button>
        </div>
      </div>
      
      {/* Decorative luxury mesh */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[#6366F1] opacity-[0.03] blur-3xl pointer-events-none rounded-full" />
    </form>
  );
}
