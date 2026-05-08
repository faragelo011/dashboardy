"use client";

import { useState } from "react";

import type { DataConnection } from "@dashboardy/types";

import { upsertConnectionAction } from "./actions";

const fieldClass =
  "min-h-11 w-full rounded-xl border border-border-4 bg-surface-1 px-3 py-2 text-sm outline-none transition focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus-ring/35 disabled:cursor-not-allowed disabled:bg-surface-5 disabled:text-ink-muted";

const primaryButtonClass =
  "min-h-11 rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-surface-3 transition hover:bg-accent-hover active:bg-accent-active disabled:cursor-not-allowed disabled:bg-border-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export function ConnectionsForm({
  workspaceId,
  connection,
}: {
  workspaceId: string;
  connection: DataConnection | null;
}) {
  const [password, setPassword] = useState("");
  const [privateKeyPem, setPrivateKeyPem] = useState("");
  const isNotConfigured = connection?.status === "not_configured";

  return (
    <form
      action={upsertConnectionAction}
      className="rounded-3xl border border-border-3 bg-surface-0 p-5 sm:p-6"
      onSubmit={() => {
        // Clear after the browser captures FormData for the server action.
        setTimeout(() => {
          setPassword("");
          setPrivateKeyPem("");
        }, 0);
      }}
    >
      <input type="hidden" name="workspace_id" value={workspaceId} />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em]">
              Connection details
            </h2>
            <p className="mt-1 max-w-[60ch] text-sm leading-6 text-ink-muted">
              Set the metadata first, then add credentials when you’re ready. After
              you submit credentials, the status becomes{" "}
              <span className="font-medium text-ink">pending test</span>.
            </p>
          </div>
          <span className="w-fit rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-soft-ink">
            Admin only
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Display name</span>
            <input
              name="name"
              required
              className={fieldClass}
              placeholder="Acme Snowflake"
              defaultValue={connection?.name ?? ""}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Warehouse</span>
            <input
              name="warehouse"
              required
              className={fieldClass}
              placeholder="COMPUTE_WH"
              defaultValue={connection?.warehouse ?? ""}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Database</span>
            <input
              name="database"
              required
              className={fieldClass}
              placeholder="ANALYTICS"
              defaultValue={connection?.database ?? ""}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Schema (optional)</span>
            <input
              name="schema"
              className={fieldClass}
              placeholder="PUBLIC"
              defaultValue={connection?.schema ?? ""}
            />
          </label>
        </div>

        <div className="rounded-2xl border border-border-2 bg-surface-3 p-4">
          <h3 className="text-sm font-semibold">Credentials</h3>
          <p className="mt-1 text-xs leading-5 text-ink-muted">
            Leave these blank to update metadata only. Provide either a{" "}
            <span className="font-medium text-ink">password</span> or a{" "}
            <span className="font-medium text-ink">private key PEM</span> (Snowflake
            key-pair auth), not both. Secrets are never echoed back.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Account</span>
              <input
                name="account"
                className={fieldClass}
                placeholder="acme.us-east-1"
                autoComplete="off"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Role</span>
              <input
                name="role"
                className={fieldClass}
                placeholder="SYSADMIN"
                autoComplete="off"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Username</span>
              <input
                name="username"
                className={fieldClass}
                placeholder="service_user"
                autoComplete="off"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Password (password auth)</span>
              <input
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                className={fieldClass}
                placeholder="Leave empty if using PEM key below"
                autoComplete="new-password"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">
                Private key PEM (key-pair auth)
              </span>
              <textarea
                name="private_key_pem"
                value={privateKeyPem}
                onChange={(event) =>
                  setPrivateKeyPem(event.currentTarget.value)
                }
                rows={6}
                className={`${fieldClass} font-mono text-xs`}
                placeholder="Paste full PEM (BEGIN … END block)"
                autoComplete="off"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">
                Key passphrase (optional, if PEM is encrypted)
              </span>
              <input
                name="private_key_passphrase"
                type="password"
                className={fieldClass}
                placeholder="Only if your PEM is encrypted"
                autoComplete="new-password"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-ink-faint">
            {isNotConfigured
              ? "Not configured yet. Submit credentials to move to pending test."
              : "Saved metadata is shown above. Submit credentials again to rotate later (Phase 5)."}
          </p>
          <button className={primaryButtonClass}>Save connection</button>
        </div>
      </div>
    </form>
  );
}
