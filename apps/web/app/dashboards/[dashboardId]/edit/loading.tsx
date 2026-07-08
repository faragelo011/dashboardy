import { AdminLuxuryRouteLoadingShell } from "@/app/admin-luxury-route-loading";

export default function DashboardEditLoading() {
  return (
    <AdminLuxuryRouteLoadingShell
      kicker="Dashboard Builder"
      title="Edit dashboard"
      subtitle="Loading dashboard builder."
      showRunQuery
      showSavedQuestions
      showDashboards
    />
  );
}
