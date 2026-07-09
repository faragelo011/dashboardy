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
  const isNotConfigured = !connection || connection.status === "not_configured";

  return (
    <form
      action={upsertConnectionAction}
      className="rounded-ds-md border border-border-1 bg-surface-0 p-5"
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

      <header className="mb-5 flex flex-col gap-1">
        <h2 className="font-display text-lg font-medium tracking-tight text-ink-strong">
          {isNotConfigured ? "Configure connection" : "Connection details"}
        </h2>
        <p className="text-sm text-ink-muted">
          {isNotConfigured
            ? "Enter warehouse metadata and initial credentials. Secrets are write-only."
            : "Update metadata anytime. Leave credential fields blank to keep the current secret."}
        </p>
      </header>

      <fieldset className="grid gap-4 sm:grid-cols-2">
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

      <div className="my-5 border-t border-border-1" />

      <section className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-medium text-ink-strong">Credentials</h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            Password or key-pair — not both.
            {!isNotConfigured ? " Leave blank to keep existing credentials." : null}
          </p>
        </div>

        {error ? (
          <div role="alert" aria-live="assertive" className="ds-alert ds-alert--danger">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
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
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="ds-label">Username</span>
            <input
              name="username"
              className="ds-input"
              placeholder="service_user"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="ds-label">
              Password{" "}
              <span className="text-ink-faint">
                {privateKeyPem.length > 0 ? "(disabled while key is set)" : ""}
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

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="ds-label">
              Private key (PEM){" "}
              <span className="text-ink-faint">
                {password.length > 0 ? "(disabled while password is set)" : ""}
              </span>
            </span>
            <textarea
              name="private_key_pem"
              value={privateKeyPem}
              onChange={(event) => {
                if (password.length === 0) setPrivateKeyPem(event.currentTarget.value);
              }}
              disabled={password.length > 0}
              rows={4}
              className="ds-textarea"
              placeholder="-----BEGIN PRIVATE KEY-----"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
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

      <div className="mt-5 flex flex-col gap-3 border-t border-border-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-muted max-w-[48ch]">
          {isNotConfigured
            ? "Saving moves the connection to pending test."
            : "Saving credentials again moves the connection to pending test."}
        </p>
        <Button
          type="submit"
          variant="primary"
          aria-label="Save connection"
          className="sm:shrink-0"
          leftIcon={<DsIcon icon={Save} />}
        >
          Save connection
        </Button>
      </div>
    </form>
  );
}
