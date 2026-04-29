import { getProtectedMe } from "./data";

export default async function ProtectedHomePage() {
  const me = await getProtectedMe();
  return (
    <main className="min-h-dvh bg-surface-app p-8 text-ink">
      <h1 className="text-2xl font-semibold text-ink-strong">Dashboardy</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Workspace: <span className="font-medium">{me.current_workspace.workspace_name}</span>
      </p>
      <p className="text-sm text-ink-muted">
        Role: <span className="font-medium">{me.current_workspace.role}</span> — status:{" "}
        <span className="font-medium">{me.current_workspace.membership_status}</span>
      </p>
      <p className="mt-4 text-xs text-ink-faint">Signed in as {me.user.email}</p>
      <p className="mt-6">
        <form action="/sign-out" method="post">
          <button
            type="submit"
            className="text-sm font-medium text-accent-soft-ink underline underline-offset-4 disabled:opacity-50"
          >
            Sign out
          </button>
        </form>
      </p>
    </main>
  );
}
