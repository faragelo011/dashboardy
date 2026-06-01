import { getProtectedMe } from "@/app/(protected)/data";

import { AdminLuxuryNavClient } from "./admin-luxury-nav-client";

/** Server shell: gates "Run query" to authoring roles only. */
export async function AdminLuxuryNav() {
  const me = await getProtectedMe();
  const showRunQuery =
    me.current_workspace.role === "admin" || me.current_workspace.role === "analyst";
  return <AdminLuxuryNavClient showRunQuery={showRunQuery} />;
}
