import { AdminLuxuryRouteLoading } from "@/app/admin-luxury-route-loading";

export default async function ConnectionsLoading() {
  return (
    <AdminLuxuryRouteLoading
      kicker="Administrative Settings"
      title={
        <>
          Data <span className="italic opacity-80">Connection</span>
        </>
      }
      subtitle="Loading secure connectivity metadata and workspace vault state."
    />
  );
}
