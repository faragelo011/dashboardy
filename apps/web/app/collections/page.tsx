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
    redirect("/");
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
    <div className="min-h-screen bg-[#06080A] text-[#F0F2F5] font-sans selection:bg-[#D4AF37]/30 selection:text-[#D4AF37]">
      <AdminLuxuryNav />
      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-12 sm:px-8 lg:py-24 animate-fade-in">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-12 max-w-3xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#D4AF37]">
            Saved questions
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-white tracking-tight font-light leading-none">
            Collections
          </h1>
          <p className="text-sm text-[#A0AAB2] font-light leading-relaxed max-w-[60ch]">
            Organize reusable questions into flat collections for{" "}
            <span className="text-white">{me.current_workspace.workspace_name}</span>.
            {canEdit
              ? " Authors can create, rename, reorder, and delete empty collections."
              : " You can browse collections granted to your role."}
          </p>
        </header>

        {loadError ? (
          <p className="text-sm text-[#EF4444]" role="alert">
            {loadError}
          </p>
        ) : null}

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <CollectionCreateForm workspaceId={workspaceId} canEdit={canEdit} />
          <section>
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-[#5C6A7A] mb-6">
              Active collections ({collections.length})
            </h2>
            {collections.length === 0 ? (
              <p className="text-sm text-[#A0AAB2]">No collections yet.</p>
            ) : (
              <ul className="flex flex-col gap-6">
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
