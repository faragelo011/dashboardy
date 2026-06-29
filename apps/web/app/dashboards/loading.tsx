import { AdminLuxuryRouteLoading } from "@/app/admin-luxury-route-loading";

export default async function DashboardsLoading() {
  return (
    <AdminLuxuryRouteLoading
      kicker="Dashboard Builder"
      title={
        <>
          Dashboard <span className="italic opacity-80">Library</span>
        </>
      }
      subtitle="Loading dashboards and workspace collections."
    />
  );
}
