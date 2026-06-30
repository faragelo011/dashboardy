import { AdminLuxuryNav } from "@/app/admin-luxury-nav";
import { getProtectedMe } from "./data";
import { WorkspaceBadge } from "./workspace-badge";

export default async function ProtectedHomePage() {
  const me = await getProtectedMe();

  return (
    <div className="min-h-screen bg-surface-app text-ink">
      <AdminLuxuryNav />
      <main className="mx-auto flex max-w-7xl flex-col px-4 py-10 sm:px-8 lg:py-14">
        <header className="mb-10 flex flex-col items-start gap-3 border-b border-border-1 pb-8">
          <WorkspaceBadge workspace={me.current_workspace} />
          <p className="ds-kicker">Overview</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-strong sm:text-3xl">
            Dashboardy
          </h1>
          <p className="max-w-[60ch] text-sm leading-relaxed text-ink-muted">
            Your workspace overview. Analytics and dashboard modules will appear here as they are provisioned.
          </p>
        </header>

        <section className="ds-card flex flex-col gap-6 p-6 sm:p-7">
          <h2 className="text-lg font-semibold tracking-tight text-ink-strong">
            Session context
          </h2>

          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <dt className="ds-kicker">Workspace</dt>
              <dd className="ds-mono text-ink">{me.current_workspace.workspace_name}</dd>
            </div>

            <div className="flex flex-col gap-1.5">
              <dt className="ds-kicker">Role</dt>
              <dt className="sr-only">Role:</dt>
              <dd className="text-base capitalize text-ink">{me.current_workspace.role}</dd>
            </div>

            <div className="flex flex-col gap-1.5">
              <dt className="ds-kicker">Signed in as</dt>
              <dd className="ds-mono truncate text-ink-muted">{me.user.email}</dd>
            </div>

            <div className="flex flex-col gap-1.5">
              <dt className="ds-kicker">Status</dt>
              <dd>
                <span className="ds-badge ds-badge--ok">{me.current_workspace.membership_status}</span>
              </dd>
            </div>
          </dl>

          <hr className="ds-divider" />

          <form action="/sign-out" method="post">
            <button type="submit" className="ds-btn ds-btn-ghost text-ink-muted hover:text-danger-ink">
              Sign out
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
