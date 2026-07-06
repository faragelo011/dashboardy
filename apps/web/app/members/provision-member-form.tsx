"use client";

import { useRef, useState, useTransition } from "react";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ds/button";
import { DsIcon } from "@/components/ds/icon";

import { provisionMemberAction } from "./actions";

type RoleOption = readonly [value: string, label: string, description: string];

type Props = {
  workspaceId: string;
  roleOptions: readonly RoleOption[];
};

export function ProvisionMemberForm({ workspaceId, roleOptions }: Props) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="ds-card flex flex-col gap-6 p-6 sm:p-7"
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

      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight text-ink-strong">Invite member</h2>
          <span className="ds-badge ds-badge--idle">Admin</span>
        </div>
        <p className="ds-help max-w-[55ch]">
          Grant workspace access. A temporary password will be created and must be reset on first sign-in.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="ds-label">Email</span>
          <input
            name="email"
            type="email"
            required
            className="ds-input"
            placeholder="you@company.com"
            disabled={isPending}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="ds-label">Role</span>
          <select
            name="role"
            className="ds-select"
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

        <label className="flex flex-col gap-1.5 lg:col-span-2">
          <span className="ds-label">Temporary password</span>
          <input
            name="initial_password"
            type="password"
            required
            minLength={8}
            className="ds-input"
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
            disabled={isPending}
          />
        </label>
      </div>

      {error ? (
        <div role="alert" className="ds-alert ds-alert--danger">
          {error}
        </div>
      ) : null}

      <hr className="ds-divider" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="ds-help max-w-[48ch]">Access can be revoked from the roster below.</p>
        <Button type="submit" variant="primary" disabled={isPending} className="sm:shrink-0" leftIcon={<DsIcon icon={UserPlus} />}>
          {isPending ? "Inviting…" : "Invite member"}
        </Button>
      </div>
    </form>
  );
}
