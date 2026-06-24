import { AdminLuxuryRouteLoading } from "@/app/admin-luxury-route-loading";

export default async function CollectionsLoading() {
  return (
    <AdminLuxuryRouteLoading
      kicker="Saved Questions"
      title={
        <>
          Question <span className="italic opacity-80">Collections</span>
        </>
      }
      subtitle="Loading flat collections for this workspace."
    />
  );
}
