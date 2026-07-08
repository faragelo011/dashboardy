import { getProtectedMe } from "@/app/(protected)/data";

import { AdminLuxuryNavClient } from "./admin-luxury-nav-client";

/** Server shell: gates nav items by workspace role. */
export async function AdminLuxuryNav() {
  const me = await getProtectedMe();
  const role = me.current_workspace.role;
  const showSavedQuestions =
    role === "admin" || role === "analyst" || role === "viewer";
  const showDashboards =
    role === "admin" || role === "analyst" || role === "viewer";
  return (
    <AdminLuxuryNavClient
      showSavedQuestions={showSavedQuestions}
      showDashboards={showDashboards}
    />
  );
}
