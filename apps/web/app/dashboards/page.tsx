import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, Plus } from "lucide-react";

import { AdminLuxuryNav } from "@/app/admin-luxury-nav";
import { getProtectedMe } from "@/app/(protected)/data";
import { listDashboards } from "@/app/lib/dashboards-api";
import { listCollections } from "@/app/lib/questions-api";
import { createServerSupabase } from "@/app/lib/supabase-server";
import { DsIcon } from "@/components/ds/icon";
import { EmptyState } from "@/components/ds/empty-state";

import {
  DashboardCollectionFilter,
  DashboardCreateForm,
  DashboardRow,
} from "./dashboard-forms";

type PageProps = {
  searchParams: Promise<{
    collection_id?: string | string[];
    new?: string | string[];
  }>;
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
  const showCreate = firstParam(params.new) === "1" && canEdit;

  let dashboards: Awaited<ReturnType<typeof listDashboards>>["dashboards"] = [];
  let collections: Awaited<ReturnType<typeof listCollections>>["collections"] = [];
  let loadError: string | null = null;
  let collectionsError: string | null = null;

  try {
    const dashboardsResp = await listDashboards(token, workspaceId, {
      collection_id: collectionFilter,
    });
    dashboards = dashboardsResp.dashboards;
  } catch (err) {
    console.error("failed to load dashboards", { workspaceId, err });
    loadError = "Failed to load dashboards. Please refresh and try again.";
  }

  if (!isExternalClient && !loadError) {
    try {
      const collectionsResp = await listCollections(token, workspaceId);
      collections = collectionsResp.collections;
    } catch (err) {
      console.error("failed to load collections for dashboard filter", {
        workspaceId,
        err,
      });
      collectionsError = "Collection filter is unavailable right now.";
    }
  }

  const editableCollections = collections.filter(
    (c) => canEdit && c.permission === "edit",
  );
  const canCreate = canEdit && editableCollections.length > 0;
  const collectionNameById = new Map(collections.map((c) => [c.id, c.name]));

  const listHref = collectionFilter
    ? `/dashboards?collection_id=${encodeURIComponent(collectionFilter)}`
    : "/dashboards";
  const createHref = collectionFilter
    ? `/dashboards?new=1&collection_id=${encodeURIComponent(collectionFilter)}`
    : "/dashboards?new=1";

  return (
    <div className="min-h-screen bg-surface-app text-ink">
      <AdminLuxuryNav />
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-8 lg:py-12">
        <header className="flex flex-col gap-4 border-b border-border-1 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="ds-kicker">Dashboard builder</p>
            <h1 className="font-display text-3xl font-medium tracking-tight text-ink-strong sm:text-4xl">
              Dashboards
            </h1>
            <p className="max-w-[55ch] text-sm leading-relaxed text-ink-muted">
              Assemble governed KPI, chart, and table widgets from saved questions for{" "}
              <span className="font-medium text-ink">
                {me.current_workspace.workspace_name}
              </span>
              .
            </p>
          </div>
          {canCreate && !showCreate ? (
            <Link href={createHref} className="dby-btn dby-btn--primary shrink-0">
              <DsIcon icon={Plus} className="dby-btn__icon" />
              New dashboard
            </Link>
          ) : null}
        </header>

        {loadError ? (
          <p className="text-sm text-danger-ink" role="alert">
            {loadError}
          </p>
        ) : null}
        {collectionsError ? (
          <p className="text-sm text-ink-muted" role="status">
            {collectionsError}
          </p>
        ) : null}

        {showCreate && canCreate ? (
          <DashboardCreateForm
            accessToken={token}
            workspaceId={workspaceId}
            collections={editableCollections}
            canEdit={canEdit}
            cancelHref={listHref}
          />
        ) : null}

        <section className="flex flex-col gap-4" aria-labelledby="dashboard-list-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="dashboard-list-heading"
              className="font-display text-xl font-medium tracking-tight text-ink-strong"
            >
              {collectionFilter ? "Filtered" : "All"}{" "}
              <span className="text-ink-muted">({dashboards.length})</span>
            </h2>
            {!isExternalClient && !collectionsError ? (
              <DashboardCollectionFilter
                collections={collections}
                currentCollectionId={collectionFilter}
              />
            ) : null}
          </div>

          {dashboards.length === 0 ? (
            <EmptyState
              icon={<DsIcon icon={LayoutDashboard} size="md" />}
              kicker={collectionFilter ? "No matches" : "No dashboards yet"}
              description={
                collectionFilter
                  ? "Nothing in this collection. Try another filter, or create a dashboard here."
                  : canCreate
                    ? "Create your first dashboard to assemble widgets from saved questions."
                    : "No dashboards are available in this workspace yet."
              }
              action={
                canCreate ? (
                  <Link href={createHref} className="dby-btn dby-btn--primary">
                    <DsIcon icon={Plus} className="dby-btn__icon" />
                    New dashboard
                  </Link>
                ) : collectionFilter ? (
                  <Link href="/dashboards" className="dby-btn dby-btn--secondary">
                    Clear filter
                  </Link>
                ) : null
              }
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {dashboards.map((dashboard) => (
                <DashboardRow
                  key={dashboard.id}
                  accessToken={token}
                  workspaceId={workspaceId}
                  dashboard={dashboard}
                  canEdit={canEdit}
                  collectionName={collectionNameById.get(dashboard.collection_id) ?? null}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
