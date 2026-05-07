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
      className="rounded-3xl border border-border-3 bg-surface-0 p-5 sm:p-6"
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

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em]">Add teammate</h2>
            <p className="mt-1 max-w-[56ch] text-sm leading-6 text-ink-muted">
              Provision access with a temporary password. The user will be forced
              to reset it on first login.
            </p>
          </div>
          <span className="w-fit rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-soft-ink">
            Admin only
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.7fr)]">
          <label className="space-y-2">
            <span className="text-sm font-medium">Email address</span>
            <input
              name="email"
              type="email"
              required
              className={fieldClass}
              placeholder="alex@company.com"
              disabled={isPending}
            />
            <span className="block text-xs leading-5 text-ink-faint">
              The user signs in with this email.
            </span>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Role</span>
            <select
              name="role"
              className={fieldClass}
              defaultValue="viewer"
              disabled={isPending}
            >
              {roleOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium">Temporary initial password</span>
          <input
            name="initial_password"
            type="password"
            required
            minLength={8}
            className={fieldClass}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            disabled={isPending}
          />
          <span className="block text-xs leading-5 text-ink-faint">
            The user must change this password the first time they sign in.
          </span>
        </label>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {roleOptions.map(([value, label, description]) => (
            <div
              key={value}
              className="rounded-2xl border border-border-2 bg-surface-3 px-3 py-3"
            >
              <div className="text-sm font-medium">{label}</div>
              <p className="mt-1 text-xs leading-5 text-ink-faint">{description}</p>
            </div>
          ))}
        </div>

        {error ? (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-danger-border bg-danger-soft-strong px-3 py-2 text-sm text-danger-ink-strong"
          >
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-border-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-ink-faint">
            Review the role before provisioning. You can change access later from
            the roster.
          </p>
          <button className={primaryButtonClass} disabled={isPending}>
            {isPending ? "Provisioning…" : "Provision member"}
          </button>
        </div>
      </div>
    </form>
  );
}

