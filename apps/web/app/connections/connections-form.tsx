"use client";

import { useState } from "react";
import { Save } from "lucide-react";

import type { DataConnection } from "@dashboardy/types";

import { Button } from "@/components/ds/button";
import { DsIcon } from "@/components/ds/icon";

import { upsertConnectionAction } from "./actions";

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
      className="ds-card flex flex-col gap-8 p-6 sm:p-7"
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
      <input type="hidden" name="workspace_id" value={workspaceId} />

      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight text-ink-strong">
            Connection details
          </h2>
          <span className="ds-badge ds-badge--idle">Admin</span>
        </div>
        <p className="ds-help max-w-[60ch]">
          Saved metadata is shown below. Credentials are write-only and never displayed back after saving.
        </p>
      </header>

      <fieldset className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="ds-label">Display name</span>
          <input
            name="name"
            aria-label="Display name"
            required
            className="ds-input"
            placeholder="Primary Snowflake"
            defaultValue={connection?.name ?? ""}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="ds-label">Warehouse</span>
          <input
            name="warehouse"
            aria-label="Warehouse"
            required
            className="ds-input"
            placeholder="COMPUTE_WH"
            defaultValue={connection?.warehouse ?? ""}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="ds-label">Database</span>
          <input
            name="database"
            aria-label="Database"
            required
            className="ds-input"
            placeholder="ANALYTICS_DB"
            defaultValue={connection?.database ?? ""}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="ds-label">
            Schema <span className="text-ink-faint">(optional)</span>
          </span>
          <input
            name="schema"
            className="ds-input"
            placeholder="PUBLIC"
            defaultValue={connection?.schema ?? ""}
          />
        </label>
      </fieldset>

      <hr className="ds-divider" />

      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-ink-strong">Credentials</h3>
          <p className="ds-help max-w-[65ch]">
            Leave blank to keep existing credentials. Use a password or an encrypted private key (PEM), not both.
          </p>
        </div>

        {error && (
          <div role="alert" aria-live="assertive" className="ds-alert ds-alert--danger">
            {error}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="ds-label">Account</span>
            <input
              name="account"
              className="ds-input"
              placeholder="acme.us-east-1"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="ds-label">Role</span>
            <input
              name="role"
              className="ds-input"
              placeholder="SYSADMIN"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="ds-label">Username</span>
            <input
              name="username"
              className="ds-input"
              placeholder="service_user"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="ds-label">
              Password{" "}
              <span className="text-ink-faint">
                {privateKeyPem.length > 0 ? "(disabled while key is set)" : "(password auth)"}
              </span>
            </span>
            <input
              name="password"
              type="password"
              value={password}
              onChange={(event) => {
                if (privateKeyPem.length === 0) setPassword(event.currentTarget.value);
              }}
              disabled={privateKeyPem.length > 0}
              className="ds-input"
              placeholder="Enter password"
              autoComplete="new-password"
            />
          </label>

          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="ds-label">
              Private key (PEM){" "}
              <span className="text-ink-faint">
                {password.length > 0 ? "(disabled while password is set)" : "(key-pair auth)"}
              </span>
            </span>
            <textarea
              name="private_key_pem"
              value={privateKeyPem}
              onChange={(event) => {
                if (password.length === 0) setPrivateKeyPem(event.currentTarget.value);
              }}
              disabled={password.length > 0}
              rows={6}
              className="ds-textarea"
              placeholder="-----BEGIN PRIVATE KEY-----"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="ds-label">
              PEM passphrase <span className="text-ink-faint">(if encrypted)</span>
            </span>
            <input
              name={password.length > 0 ? undefined : "private_key_passphrase"}
              type="password"
              className="ds-input"
              placeholder="Decryption passphrase"
              autoComplete="new-password"
              disabled={password.length > 0}
            />
          </label>
        </div>
      </section>

      <hr className="ds-divider" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="ds-help max-w-[48ch]">
          {isNotConfigured
            ? "Not configured yet. Saving moves the connection to pending test."
            : "Saving submits the credentials again and moves the connection to pending test."}
        </p>
        <Button type="submit" variant="primary" aria-label="Save connection" className="sm:shrink-0" leftIcon={<DsIcon icon={Save} />}>
          Save connection
        </Button>
      </div>
    </form>
  );
}
