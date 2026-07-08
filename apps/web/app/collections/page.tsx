import { redirect } from "next/navigation";

import { AdminLuxuryNav } from "@/app/admin-luxury-nav";
import { getProtectedMe } from "@/app/(protected)/data";
import { listCollections } from "@/app/lib/questions-api";
import { createServerSupabase } from "@/app/lib/supabase-server";

import { CollectionCreateForm, CollectionRow } from "./collection-form";

export default async function CollectionsPage() {
  const me = await getProtectedMe();
  const role = me.current_workspace.role;
  if (role === "external_client") {
    redirect("/dashboards");
  }

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
  let collections: Awaited<ReturnType<typeof listCollections>>["collections"] = [];
  let loadError: string | null = null;
  try {
    const resp = await listCollections(token, workspaceId);
    collections = resp.collections.sort((a, b) => a.sort_order - b.sort_order);
  } catch (err) {
    console.error("failed to load collections", { workspaceId, err });
    loadError = "Failed to load collections. Please refresh and try again.";
  }

  return (
    <div className="min-h-screen bg-surface-app text-ink">
      <AdminLuxuryNav />
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-8 lg:py-14">
        <header className="max-w-3xl space-y-3 border-b border-border-1 pb-8">
          <p className="ds-kicker">Saved questions</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-strong sm:text-3xl">
            Collections
          </h1>
          <p className="max-w-[60ch] text-sm leading-relaxed text-ink-muted">
            Organize reusable questions into flat collections for{" "}
            <span className="font-medium text-ink">{me.current_workspace.workspace_name}</span>.
            {canEdit
              ? " Authors can create, rename, reorder, and delete empty collections."
              : " You can browse collections granted to your role."}
          </p>
        </header>

        {loadError ? (
          <p className="text-sm text-danger-ink" role="alert">{loadError}</p>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <CollectionCreateForm workspaceId={workspaceId} canEdit={canEdit} />
          <section>
            <h2 className="mb-4 text-sm font-medium text-ink-muted">
              Active collections ({collections.length})
            </h2>
            {collections.length === 0 ? (
              <p className="ds-help">No collections yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {collections.map((collection) => (
                  <CollectionRow
                    key={collection.id}
                    collection={collection}
                    workspaceId={workspaceId}
                    canEdit={canEdit && collection.permission === "edit"}
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
