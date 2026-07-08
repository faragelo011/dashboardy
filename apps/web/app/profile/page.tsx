import { AdminLuxuryNav } from "@/app/admin-luxury-nav";
import { getProtectedMe } from "@/app/(protected)/data";
import { WorkspaceBadge } from "@/app/(protected)/workspace-badge";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { Divider, Kicker } from "@/components/ds/card";
import { PageHeader } from "@/components/ds/page-header";

export default async function ProfilePage() {
  const me = await getProtectedMe();

  return (
    <div className="min-h-screen bg-surface-app text-ink">
      <AdminLuxuryNav />
      <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-8 lg:py-14">
        <div className="flex flex-col gap-3">
          <WorkspaceBadge workspace={me.current_workspace} />
          <PageHeader
            kicker={<Kicker>Account</Kicker>}
            title="Profile"
            description="Your workspace membership and session details."
          />
        </div>

        <Card padding="md" className="flex flex-col gap-6">
          <h2 className="font-display text-[var(--text-h2)] font-semibold tracking-tight text-ink-strong">
            Session context
          </h2>

          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <dt className="dby-kicker">Workspace</dt>
              <dd className="ds-mono text-ink">{me.current_workspace.workspace_name}</dd>
            </div>

            <div className="flex flex-col gap-1.5">
              <dt className="dby-kicker">Role</dt>
              <dd className="capitalize text-ink">{me.current_workspace.role}</dd>
            </div>

            <div className="flex flex-col gap-1.5">
              <dt className="dby-kicker">Signed in as</dt>
              <dd className="ds-mono truncate text-ink-muted">{me.user.email}</dd>
            </div>

            <div className="flex flex-col gap-1.5">
              <dt className="dby-kicker">Status</dt>
              <dd>
                <Badge tone="ok">{me.current_workspace.membership_status}</Badge>
              </dd>
            </div>
          </dl>

          <Divider />

          <form action="/sign-out" method="post">
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
