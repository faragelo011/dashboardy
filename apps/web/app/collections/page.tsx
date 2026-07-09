import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderOpen, Plus } from "lucide-react";

import { AdminLuxuryNav } from "@/app/admin-luxury-nav";
import { getProtectedMe } from "@/app/(protected)/data";
import { listCollections } from "@/app/lib/questions-api";
import { createServerSupabase } from "@/app/lib/supabase-server";
import { DsIcon } from "@/components/ds/icon";
import { EmptyState } from "@/components/ds/empty-state";

import { CollectionCreateForm, CollectionRow } from "./collection-form";

type PageProps = {
  searchParams: Promise<{
    new?: string | string[];
    edit?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }
  return value?.trim() || undefined;
}

export default async function CollectionsPage({ searchParams }: PageProps) {
  const me = await getProtectedMe();
  const role = me.current_workspace.role;
  if (role === "external_client") {
    redirect("/dashboards");
  }

  const canEdit = role === "admin" || role === "analyst";
  const params = await searchParams;
  const showCreate = firstParam(params.new) === "1" && canEdit;
  const editingId = firstParam(params.edit);

  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    redirect("/sign-in");
  }

  const workspaceId = me.current_workspace.workspace_id;
  let collections: Awaited<ReturnType<typeof listCollections>>["collections"] = [];
  let loadError: string | null = null;
  try {
    const resp = await listCollections(token, workspaceId);
    collections = resp.collections.sort((a, b) => a.sort_order - b.sort_order);
  } catch (err) {
    console.error("failed to load collections", { workspaceId, err });
    loadError = "Failed to load collections. Please refresh and try again.";
  }

  const nextSortOrder =
    collections.length === 0
      ? 0
      : Math.max(...collections.map((c) => c.sort_order)) + 1;

  return (
    <div className="min-h-screen bg-surface-app text-ink">
      <AdminLuxuryNav />
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-8 lg:py-12">
        <header className="flex flex-col gap-4 border-b border-border-1 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="ds-kicker">Saved questions</p>
            <h1 className="font-display text-3xl font-medium tracking-tight text-ink-strong sm:text-4xl">
              Collections
            </h1>
            <p className="max-w-[55ch] text-sm leading-relaxed text-ink-muted">
              Organize reusable questions into flat collections for{" "}
              <span className="font-medium text-ink">
                {me.current_workspace.workspace_name}
              </span>
              .
              {canEdit
                ? " Create, rename, reorder, and delete empty collections."
                : " Browse collections granted to your role."}
            </p>
          </div>
          {canEdit && !showCreate ? (
            <Link href="/collections?new=1" className="dby-btn dby-btn--primary shrink-0">
              <DsIcon icon={Plus} className="dby-btn__icon" />
              New collection
            </Link>
          ) : null}
        </header>

        {loadError ? (
          <p className="text-sm text-danger-ink" role="alert">
            {loadError}
          </p>
        ) : null}

        {showCreate ? (
          <CollectionCreateForm
            workspaceId={workspaceId}
            canEdit={canEdit}
            cancelHref="/collections"
            defaultSortOrder={nextSortOrder}
          />
        ) : null}

        <section className="flex flex-col gap-4" aria-labelledby="collections-list-heading">
          <h2
            id="collections-list-heading"
            className="font-display text-xl font-medium tracking-tight text-ink-strong"
          >
            All{" "}
            <span className="text-ink-muted">({collections.length})</span>
          </h2>

          {collections.length === 0 ? (
            <EmptyState
              icon={<DsIcon icon={FolderOpen} size="md" />}
              kicker="No collections yet"
              description={
                canEdit
                  ? "Create a collection to organize saved questions."
                  : "No collections are available in this workspace yet."
              }
              action={
                canEdit ? (
                  <Link href="/collections?new=1" className="dby-btn dby-btn--primary">
                    <DsIcon icon={Plus} className="dby-btn__icon" />
                    New collection
                  </Link>
                ) : null
              }
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {collections.map((collection) => (
                <CollectionRow
                  key={collection.id}
                  collection={collection}
                  workspaceId={workspaceId}
                  canEdit={canEdit && collection.permission === "edit"}
                  editing={editingId === collection.id}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
