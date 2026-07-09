import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminLuxuryNav } from "@/app/admin-luxury-nav";
import { getProtectedMe } from "@/app/(protected)/data";
import { getDashboard, ApiError } from "@/app/lib/dashboards-api";
import { createServerSupabase } from "@/app/lib/supabase-server";

import { CloneDashboardAction } from "./clone-action";
import { DashboardViewerShell } from "./dashboard-viewer-shell";

type PageProps = {
  params: Promise<{ dashboardId: string }>;
};

export default async function DashboardViewerPage({ params }: PageProps) {
  const me = await getProtectedMe();

  const { dashboardId } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    redirect("/sign-in");
  }

  const workspaceId = me.current_workspace.workspace_id;
  const role = me.current_workspace.role;
  const canClone = role === "admin" || role === "analyst";
  let dashboard: Awaited<ReturnType<typeof getDashboard>> | null = null;
  let loadError: string | null = null;

  try {
    dashboard = await getDashboard(token, workspaceId, dashboardId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    console.error("failed to load dashboard", { workspaceId, dashboardId, err });
    loadError = "Failed to load this dashboard.";
  }

  if (!dashboard && !loadError) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-surface-app text-ink">
      <AdminLuxuryNav />
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-8 lg:py-14">
        {loadError || !dashboard ? (
          <p className="text-sm text-danger-ink" role="alert">
            {loadError}
          </p>
        ) : (
          <>
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border-1 pb-6">
              <div className="space-y-2">
                <p className="ds-kicker">Dashboard</p>
                <h1 className="font-display text-2xl font-medium tracking-tight text-ink-strong sm:text-3xl">
                  {dashboard.title}
                </h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/dashboards" className="ds-btn ds-btn-secondary">
                  Back to list
                </Link>
                {dashboard.can_edit ? (
                  <Link
                    href={`/dashboards/${dashboardId}/edit`}
                    className="ds-btn ds-btn-primary"
                  >
                    Edit
                  </Link>
                ) : null}
                {canClone ? (
                  <CloneDashboardAction
                    accessToken={token}
                    workspaceId={workspaceId}
                    dashboardId={dashboardId}
                  />
                ) : null}
              </div>
            </header>
            <DashboardViewerShell
              accessToken={token}
              workspaceId={workspaceId}
              dashboard={dashboard}
            />
          </>
        )}
      </div>
    </div>
  );
}
