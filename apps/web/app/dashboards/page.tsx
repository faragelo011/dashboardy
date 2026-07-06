import { redirect } from "next/navigation";

import { AdminLuxuryNav } from "@/app/admin-luxury-nav";
import { getProtectedMe } from "@/app/(protected)/data";
import { listDashboards } from "@/app/lib/dashboards-api";
import { listCollections } from "@/app/lib/questions-api";
import { createServerSupabase } from "@/app/lib/supabase-server";

import { DashboardCreateForm, DashboardRow } from "./dashboard-forms";

type PageProps = {
  searchParams: Promise<{ collection_id?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }
  return value?.trim() || undefined;
}

export default async function DashboardsPage({ searchParams }: PageProps) {
  const me = await getProtectedMe();
  const role = me.current_workspace.role;
  const isExternalClient = role === "external_client";

  const canEdit = role === "admin" || role === "analyst";
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    redirect("/sign-in");
  }

  const workspaceId = me.current_workspace.workspace_id;
  const params = await searchParams;
  const collectionFilter = firstParam(params.collection_id);

  let dashboards: Awaited<ReturnType<typeof listDashboards>>["dashboards"] = [];
  let collections: Awaited<ReturnType<typeof listCollections>>["collections"] = [];
  let loadError: string | null = null;

  try {
    const dashboardsResp = await listDashboards(token, workspaceId, {
      collection_id: collectionFilter,
    });
    dashboards = dashboardsResp.dashboards;
    if (!isExternalClient) {
      const collectionsResp = await listCollections(token, workspaceId);
      collections = collectionsResp.collections;
    }
  } catch (err) {
    console.error("failed to load dashboards", { workspaceId, err });
    loadError = "Failed to load dashboards. Please refresh and try again.";
  }

  const editableCollections = collections.filter(
    (c) => canEdit && c.permission === "edit",
  );

  return (
    <div className="min-h-screen bg-surface-app text-ink">
      <AdminLuxuryNav />
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-8 lg:py-14">
        <header className="max-w-3xl space-y-3 border-b border-border-1 pb-8">
          <p className="ds-kicker">Dashboard builder</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-strong sm:text-3xl">
            Dashboards
          </h1>
          <p className="max-w-[60ch] text-sm leading-relaxed text-ink-muted">
            Assemble governed KPI, chart, and table widgets from saved questions for{" "}
            <span className="font-medium text-ink">
              {me.current_workspace.workspace_name}
            </span>
            .
          </p>
        </header>

        {loadError ? (
          <p className="text-sm text-danger-ink" role="alert">
            {loadError}
          </p>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <DashboardCreateForm
            accessToken={token}
            workspaceId={workspaceId}
            collections={editableCollections}
            canEdit={canEdit}
          />
          <section className="flex flex-col gap-4">
            {!isExternalClient ? (
              <form method="get" className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="ds-label">Collection filter</span>
                <select
                  name="collection_id"
                  defaultValue={collectionFilter ?? ""}
                  className="ds-input min-w-[200px]"
                >
                  <option value="">All collections</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="ds-btn ds-btn-secondary">
                Apply
              </button>
            </form>
            ) : null}
            <h2 className="text-sm font-medium text-ink-muted">
              Dashboards ({dashboards.length})
            </h2>
            {dashboards.length === 0 ? (
              <p className="ds-help">No dashboards yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {dashboards.map((dashboard) => (
                  <DashboardRow
                    key={dashboard.id}
                    accessToken={token}
                    workspaceId={workspaceId}
                    dashboard={dashboard}
                    canEdit={canEdit}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
