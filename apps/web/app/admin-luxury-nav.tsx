import { getProtectedMe } from "@/app/(protected)/data";

import { AdminLuxuryNavClient } from "./admin-luxury-nav-client";

/** Server shell: gates “Run query” to internal workspace roles (not `external_client`). */
export async function AdminLuxuryNav() {
  const me = await getProtectedMe();
  const showRunQuery = me.current_workspace.role !== "external_client";
  return <AdminLuxuryNavClient showRunQuery={showRunQuery} />;
}
