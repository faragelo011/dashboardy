import { AdminLuxuryRouteLoading } from "@/app/admin-luxury-route-loading";

export default async function DashboardEditLoading() {
  return (
    <AdminLuxuryRouteLoading
      kicker="Dashboard Builder"
      title="Edit dashboard"
      subtitle="Loading dashboard builder."
    />
  );
}

