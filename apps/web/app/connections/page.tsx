import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, PlugZap } from "lucide-react";

import { AdminLuxuryNav } from "@/app/admin-luxury-nav";
import { getProtectedMe } from "@/app/(protected)/data";
import { getWorkspaceConnection } from "@/app/lib/connections-api";
import { createServerSupabase } from "@/app/lib/supabase-server";
import { Alert } from "@/components/ds/alert";
import { ALERT_ICON_LOCK } from "@/components/ds/alert-icons";
import { Button } from "@/components/ds/button";
import { DsIcon } from "@/components/ds/icon";

import { ConnectionsForm } from "./connections-form";
import { rotateConnectionAction, testConnectionAction } from "./actions";

const formatUtcDateTime = (value: string) =>
  new Intl.DateTimeFormat("en", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(new Date(value));

function statusBadgeClass(status: string) {
  switch (status) {
    case "active":
      return "ds-badge ds-badge--ok";
    case "pending_test":
      return "ds-badge ds-badge--warn";
    case "test_failed":
      return "ds-badge ds-badge--danger";
    default:
      return "ds-badge ds-badge--idle";
  }
}

function statusHint(status?: string) {
  switch (status) {
    case "active":
      return "Handshake succeeded. Queries can use this connection.";
    case "pending_test":
      return "Saved — run a diagnostic test to activate.";
    case "test_failed":
      return "Last test failed. Fix credentials or network, then retest.";
    case "not_configured":
      return "No warehouse configured yet.";
    default:
      return "Configure Snowflake metadata and credentials below.";
  }
}

const isTestable = (status?: string) =>
  !!status && status !== "not_configured";

type PageProps = {
  searchParams: Promise<{ rotate?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }
  return value?.trim() || undefined;
}

export default async function ConnectionsPage({ searchParams }: PageProps) {
  const me = await getProtectedMe();
  if (me.current_workspace.role !== "admin") {
    redirect("/dashboards");
  }

  const params = await searchParams;
  const showRotate = firstParam(params.rotate) === "1";

  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    redirect("/sign-in");
  }

  const workspaceId = me.current_workspace.workspace_id;
  let connection: Awaited<ReturnType<typeof getWorkspaceConnection>> | null = null;
  let loadError: string | null = null;
  try {
    connection = await getWorkspaceConnection(token, workspaceId);
  } catch (err) {
    console.error("failed to load connection", { workspaceId, err });
    loadError = "Failed to load connection settings. Please refresh and try again.";
  }

  const status = connection?.status;
  const testable = isTestable(status);
  const configured = !!connection && status !== "not_configured";

  return (
    <div className="min-h-screen bg-surface-app text-ink">
      <AdminLuxuryNav />
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-8 lg:py-12">
        <header className="flex flex-col gap-4 border-b border-border-1 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="ds-kicker">Administrative settings</p>
            <h1 className="font-display text-3xl font-medium tracking-tight text-ink-strong sm:text-4xl">
              Data connection
            </h1>
            <p className="max-w-[55ch] text-sm leading-relaxed text-ink-muted">
              Snowflake connectivity for{" "}
              <span className="font-medium text-ink">
                {me.current_workspace.workspace_name}
              </span>
              . Secrets are write-only and never returned after saving.
            </p>
          </div>
          {connection ? (
            <span className={statusBadgeClass(connection.status)}>
              {connection.status.replace(/_/g, " ")}
            </span>
          ) : null}
        </header>

        {loadError ? (
          <section className="dby-alert dby-alert--danger" role="alert">
            <div className="dby-alert__body">
              <span className="dby-alert__title">Failed to load</span>
              <span>{loadError}</span>
            </div>
          </section>
        ) : null}

        {/* Status + test — primary operational surface */}
        <section
          className="rounded-ds-md border border-border-1 bg-surface-2 p-5"
          aria-labelledby="connection-status-heading"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <h2
                id="connection-status-heading"
                className="font-display text-lg font-medium tracking-tight text-ink-strong"
              >
                {configured
                  ? connection?.name || "Snowflake connection"
                  : "Not configured"}
              </h2>
              <p className="text-sm text-ink-muted">{statusHint(status)}</p>
              {configured ? (
                <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                  {connection?.warehouse ? (
                    <div>
                      <dt className="inline text-ink-faint">Warehouse </dt>
                      <dd className="inline ds-mono text-ink">{connection.warehouse}</dd>
                    </div>
                  ) : null}
                  {connection?.database ? (
                    <div>
                      <dt className="inline text-ink-faint">Database </dt>
                      <dd className="inline ds-mono text-ink">{connection.database}</dd>
                    </div>
                  ) : null}
                  {connection?.schema ? (
                    <div>
                      <dt className="inline text-ink-faint">Schema </dt>
                      <dd className="inline ds-mono text-ink">{connection.schema}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="inline text-ink-faint">Credentials </dt>
                    <dd className="inline text-ink">
                      {connection?.has_credentials ? "Stored" : "Missing"}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </div>

            <form action={testConnectionAction} className="shrink-0">
              <input type="hidden" name="workspace_id" value={workspaceId} />
              <Button
                type="submit"
                variant={status === "pending_test" ? "primary" : "secondary"}
                aria-label="Test connection"
                disabled={!testable}
                leftIcon={<DsIcon icon={PlugZap} />}
              >
                Test connection
              </Button>
            </form>
          </div>

          {configured ? (
            <dl className="mt-4 grid gap-3 border-t border-border-1 pt-4 sm:grid-cols-2">
              <div>
                <dt className="ds-kicker">Last tested</dt>
                <dd className="mt-1 ds-mono text-sm text-ink">
                  {connection?.last_tested_at
                    ? formatUtcDateTime(connection.last_tested_at)
                    : "Never"}
                </dd>
              </div>
              <div>
                <dt className="ds-kicker">Last successful</dt>
                <dd className="mt-1 ds-mono text-sm text-ink">
                  {connection?.last_successful_test_at
                    ? formatUtcDateTime(connection.last_successful_test_at)
                    : "Never"}
                </dd>
              </div>
            </dl>
          ) : null}

          {connection?.last_error ? (
            <div className="dby-alert dby-alert--danger mt-4" role="alert">
              <div className="dby-alert__body">
                <span className="dby-alert__title">Test failed</span>
                <pre className="ds-mono whitespace-pre-wrap break-all text-sm">
                  {connection.last_error}
                </pre>
              </div>
            </div>
          ) : null}
        </section>

        <Alert
          tone="info"
          title="Security"
          icon={<DsIcon icon={ALERT_ICON_LOCK} size="sm" />}
        >
          Credentials are write-only. The API never returns secrets after they are saved.
        </Alert>

        <ConnectionsForm workspaceId={workspaceId} connection={connection} />

        {/* Rotate — progressive, only when a connection exists */}
        {testable ? (
          <section className="flex flex-col gap-4" aria-labelledby="rotate-heading">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl space-y-1">
                <h2
                  id="rotate-heading"
                  className="font-display text-xl font-medium tracking-tight text-ink-strong"
                >
                  Rotate credentials
                </h2>
                <p className="text-sm text-ink-muted">
                  Replace the stored secret. Status returns to pending test until a successful diagnostic.
                </p>
              </div>
              {!showRotate ? (
                <Link
                  href="/connections?rotate=1"
                  className="dby-btn dby-btn--secondary shrink-0"
                >
                  <DsIcon icon={KeyRound} className="dby-btn__icon" />
                  Rotate credentials
                </Link>
              ) : null}
            </div>

            {showRotate ? (
              <form
                action={rotateConnectionAction}
                className="rounded-ds-md border border-border-1 bg-surface-2 p-5"
                aria-labelledby="rotate-form-heading"
              >
                <input type="hidden" name="workspace_id" value={workspaceId} />
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3
                      id="rotate-form-heading"
                      className="font-display text-lg font-medium tracking-tight text-ink-strong"
                    >
                      New credentials
                    </h3>
                    <p className="mt-1 text-sm text-ink-muted">
                      Provide a password or a key-pair, not both. A failed test keeps the previous secret.
                    </p>
                  </div>
                  <Link href="/connections" className="dby-btn dby-btn--ghost ds-btn--sm">
                    Cancel
                  </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="ds-label">Account</span>
                    <input
                      name="rotate_account"
                      className="ds-input"
                      placeholder="acme.us-east-1"
                      autoComplete="off"
                      required
                      autoFocus
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="ds-label">Role</span>
                    <input
                      name="rotate_role"
                      className="ds-input"
                      placeholder="SYSADMIN"
                      autoComplete="off"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="ds-label">Username</span>
                    <input
                      name="rotate_username"
                      className="ds-input"
                      placeholder="service_user"
                      autoComplete="off"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="ds-label">Password</span>
                    <input
                      name="rotate_password"
                      type="password"
                      className="ds-input"
                      placeholder="Leave empty if using a key-pair"
                      autoComplete="new-password"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="ds-label">Private key (PEM)</span>
                    <textarea
                      name="rotate_private_key_pem"
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
                      name="rotate_private_key_passphrase"
                      type="password"
                      className="ds-input"
                      placeholder="Decryption passphrase"
                      autoComplete="new-password"
                    />
                  </label>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    type="submit"
                    variant="danger"
                    aria-label="Rotate credentials"
                    leftIcon={<DsIcon icon={KeyRound} />}
                  >
                    Rotate credentials
                  </Button>
                </div>
              </form>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
