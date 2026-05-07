import { redirect } from "next/navigation";

import { getProtectedMe } from "@/app/(protected)/data";
import { getWorkspaceConnection } from "@/app/lib/connections-api";
import { createServerSupabase } from "@/app/lib/supabase-server";

import { ConnectionsForm } from "./connections-form";

const statusPill = (status: string) => {
  switch (status) {
    case "active":
      return "bg-success-soft text-success-soft-ink";
    case "pending_test":
      return "bg-warning-soft text-warning-soft-ink";
    case "test_failed":
      return "bg-danger-soft text-danger-ink-strong";
    default:
      return "bg-surface-4 text-ink-faint";
  }
};

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
  let connection:
    | Awaited<ReturnType<typeof getWorkspaceConnection>>
    | null = null;
  let loadError: string | null = null;
  try {
    connection = await getWorkspaceConnection(token, workspaceId);
  } catch (err) {
    console.error("failed to load connection", { workspaceId, err });
    loadError = "Failed to load connection settings. Please refresh and try again.";
  }

  const isNotConfigured = connection?.status === "not_configured";

  return (
    <main className="bg-surface-app text-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              Admin settings
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-ink-strong">
                Data connection
              </h1>
              <p className="max-w-[70ch] text-sm leading-6 text-ink-muted">
                Configure the tenant’s Snowflake connection metadata and submit
                credentials securely. Credentials are never shown again after
                you submit them.
              </p>
            </div>
          </div>

          {connection ? (
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusPill(
                  connection.status,
                )}`}
              >
                {connection.status.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-ink-faint">
                Workspace:{" "}
                <span className="font-medium text-ink">
                  {me.current_workspace.workspace_name}
                </span>
              </span>
            </div>
          ) : null}
        </header>

        {loadError ? (
          <section
            className="rounded-2xl border border-danger-border bg-danger-soft-strong p-4 text-sm text-danger-ink-strong"
            role="alert"
          >
            <h2 className="font-semibold">Connection data did not load</h2>
            <p className="mt-1 leading-6">{loadError}</p>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <ConnectionsForm workspaceId={workspaceId} connection={connection} />

          <aside className="rounded-3xl border border-border-3 bg-surface-5 p-5">
            <h2 className="text-sm font-semibold">What happens next</h2>
            <ol className="mt-4 space-y-3 text-sm text-ink-muted">
              <li>
                <span className="font-medium text-ink">1.</span> Save metadata and
                credentials. Status becomes <span className="font-medium">pending test</span>.
              </li>
              <li>
                <span className="font-medium text-ink">2.</span> In the next phase,
                you’ll run a connection test to activate credentials.
              </li>
              <li>
                <span className="font-medium text-ink">3.</span> If a test fails,
                you’ll see a sanitized error without secrets.
              </li>
            </ol>
            <p className="mt-5 rounded-2xl bg-surface-2 p-3 text-xs leading-5 text-ink-muted">
              Security note: credentials are stored only in the backend secret
              store. This page never displays secret values after submission.
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}
