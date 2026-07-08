import { AdminLuxuryRouteLoading } from "@/app/admin-luxury-route-loading";

export default async function DashboardDetailLoading() {
  return (
    <AdminLuxuryRouteLoading
      kicker="Dashboard Builder"
      title="Dashboard"
      subtitle="Loading dashboard layout and widgets."
    />
  );
}

