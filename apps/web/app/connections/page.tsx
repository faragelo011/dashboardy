import { redirect } from "next/navigation";

import { AdminLuxuryNav } from "@/app/admin-luxury-nav";
import { getProtectedMe } from "@/app/(protected)/data";
import { getWorkspaceConnection } from "@/app/lib/connections-api";
import { createServerSupabase } from "@/app/lib/supabase-server";

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

const isTestable = (status?: string) =>
  !!status && status !== "not_configured";

export default async function ConnectionsPage() {
  const me = await getProtectedMe();
  if (me.current_workspace.role !== "admin") {
    redirect("/");
  }

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

  return (
    <div className="min-h-screen bg-surface-app text-ink">
      <AdminLuxuryNav />
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-8 lg:py-14">
        {/* Header */}
        <header className="flex flex-col gap-6 border-b border-border-1 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="ds-kicker">Administrative settings</p>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-ink-strong sm:text-3xl">
              Data connection
            </h1>
            <p className="max-w-[60ch] text-sm leading-relaxed text-ink-muted">
              Configure connectivity metadata and deploy credentials. Secrets are stored write-only and never returned after saving.
            </p>
          </div>

          {connection ? (
            <div className="flex flex-col items-start gap-2 lg:items-end">
              <span className={statusBadgeClass(connection.status)}>
                {connection.status.replace(/_/g, " ")}
              </span>
              <span className="ds-help">
                Workspace{" "}
                <span className="ds-mono text-ink">{me.current_workspace.workspace_name}</span>
              </span>
            </div>
          ) : null}
        </header>

        {loadError ? (
          <section className="ds-alert ds-alert--danger" role="alert">
            <div>
              <h2 className="mb-1 font-semibold">Failed to load</h2>
              <p>{loadError}</p>
            </div>
          </section>
        ) : null}

        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
          <div className="flex flex-col gap-8">
            <ConnectionsForm workspaceId={workspaceId} connection={connection} />

            {/* Diagnostic test */}
            <div className="ds-card flex flex-col gap-6 p-6 sm:p-7">
              <header className="flex flex-col gap-4 border-b border-border-1 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-semibold tracking-tight text-ink-strong">
                    Diagnostic test
                  </h2>
                  <p className="ds-help max-w-[44ch]">
                    Runs a connection handshake against the warehouse. On success the connection becomes active.
                  </p>
                </div>
                <form action={testConnectionAction} className="shrink-0">
                  <input type="hidden" name="workspace_id" value={workspaceId} />
                  <button
                    aria-label="Test connection"
                    className="ds-btn ds-btn-secondary"
                    disabled={!testable}
                  >
                    Test connection
                  </button>
                </form>
              </header>

              <dl className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <dt className="ds-kicker">Last tested</dt>
                  <dd className="ds-mono text-ink">
                    {connection?.last_tested_at ? formatUtcDateTime(connection.last_tested_at) : "Never"}
                  </dd>
                </div>
                <div className="flex flex-col gap-1.5">
                  <dt className="ds-kicker">Last successful</dt>
                  <dd className="ds-mono text-ink">
                    {connection?.last_successful_test_at
                      ? formatUtcDateTime(connection.last_successful_test_at)
                      : "Never"}
                  </dd>
                </div>
              </dl>

              {connection?.last_error ? (
                <div className="ds-alert ds-alert--danger" role="alert">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold">Test failed</span>
                    <pre className="ds-mono whitespace-pre-wrap break-all text-ink-muted">
                      {connection.last_error}
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Credential rotation */}
            <div className="ds-card flex flex-col gap-6 p-6 sm:p-7">
              <header className="flex flex-col gap-2 border-b border-border-1 pb-5">
                <h2 className="text-lg font-semibold tracking-tight text-ink-strong">
                  Rotate credentials
                </h2>
                <p className="ds-help max-w-[60ch]">
                  Rotation is test-gated: the connection returns to pending test until a successful diagnostic. Provide a password or a key-pair, not both.
                </p>
              </header>

              <form action={rotateConnectionAction} className="flex flex-col gap-5">
                <input type="hidden" name="workspace_id" value={workspaceId} />

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="ds-label">Account</span>
                    <input
                      name="rotate_account"
                      className="ds-input"
                      placeholder="acme.us-east-1"
                      autoComplete="off"
                      required
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
                  <label className="flex flex-col gap-1.5 md:col-span-2">
                    <span className="ds-label">Username</span>
                    <input
                      name="rotate_username"
                      className="ds-input"
                      placeholder="service_user"
                      autoComplete="off"
                      required
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 md:col-span-2">
                    <span className="ds-label">Password</span>
                    <input
                      name="rotate_password"
                      type="password"
                      className="ds-input"
                      placeholder="Leave empty if using a key-pair"
                      autoComplete="new-password"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 md:col-span-2">
                    <span className="ds-label">Private key (PEM)</span>
                    <textarea
                      name="rotate_private_key_pem"
                      rows={5}
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
                      name="rotate_private_key_passphrase"
                      type="password"
                      className="ds-input"
                      placeholder="Decryption passphrase"
                      autoComplete="new-password"
                    />
                  </label>
                </div>

                <hr className="ds-divider" />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="ds-help max-w-[50ch]">
                    Status returns to pending test on submit. A failed test keeps the previous credentials.
                  </p>
                  <button
                    aria-label="Rotate credentials"
                    className="ds-btn ds-btn-danger sm:shrink-0"
                    disabled={!testable}
                  >
                    Rotate credentials
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar / procedure */}
          <aside className="flex flex-col gap-6">
            <div className="ds-card flex flex-col gap-4 p-6 sm:p-7">
              <h2 className="text-lg font-semibold tracking-tight text-ink-strong">
                Procedure
              </h2>
              <ol className="flex flex-col gap-5">
                <li className="flex flex-col gap-1">
                  <span className="ds-kicker">Step 1 · Save</span>
                  <span className="text-sm leading-relaxed text-ink-muted">
                    Enter connection metadata and initial credentials. The connection moves to pending test.
                  </span>
                </li>
                <li className="flex flex-col gap-1">
                  <span className="ds-kicker">Step 2 · Test</span>
                  <span className="text-sm leading-relaxed text-ink-muted">
                    Run the diagnostic. A successful handshake activates the connection.
                  </span>
                </li>
                <li className="flex flex-col gap-1">
                  <span className="ds-kicker">Step 3 · Rotate</span>
                  <span className="text-sm leading-relaxed text-ink-muted">
                    Replace credentials when needed. Rotation is gated by a successful test.
                  </span>
                </li>
              </ol>
            </div>

            <div className="ds-alert ds-alert--info">
              <div className="flex flex-col gap-1">
                <span className="font-semibold">Security</span>
                <span>
                  Credentials are write-only. The API never returns secrets after they are saved.
                </span>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
