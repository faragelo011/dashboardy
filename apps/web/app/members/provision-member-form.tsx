"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { UserPlus, X } from "lucide-react";

import { Button } from "@/components/ds/button";
import { DsIcon } from "@/components/ds/icon";

import { provisionMemberAction } from "./actions";

type RoleOption = readonly [value: string, label: string, description: string];

type Props = {
  workspaceId: string;
  roleOptions: readonly RoleOption[];
  cancelHref?: string;
};

export function ProvisionMemberForm({
  workspaceId,
  roleOptions,
  cancelHref = "/members",
}: Props) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      aria-labelledby="invite-member-heading"
      className="rounded-ds-md border border-border-1 bg-surface-2 p-5"
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

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2
            id="invite-member-heading"
            className="font-display text-lg font-medium tracking-tight text-ink-strong"
          >
            Invite member
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            They’ll get a temporary password and must reset it on first sign-in.
          </p>
        </div>
        <Link
          href={cancelHref}
          className="dby-iconbtn dby-iconbtn--ghost"
          aria-label="Cancel invite"
        >
          <DsIcon icon={X} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="ds-label">Email</span>
          <input
            name="email"
            type="email"
            required
            className="ds-input"
            placeholder="you@company.com"
            autoFocus
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

        <label className="flex flex-col gap-1.5">
          <span className="ds-label">Temporary password</span>
          <input
            name="initial_password"
            type="password"
            required
            minLength={8}
            className="ds-input"
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            disabled={isPending}
          />
        </label>
      </div>

      {error ? (
        <div role="alert" className="ds-alert ds-alert--danger mt-4">
          {error}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <Link href={cancelHref} className="dby-btn dby-btn--ghost">
          Cancel
        </Link>
        <Button
          type="submit"
          variant="primary"
          disabled={isPending}
          leftIcon={<DsIcon icon={UserPlus} />}
        >
          {isPending ? "Inviting…" : "Invite member"}
        </Button>
      </div>
    </form>
  );
}
