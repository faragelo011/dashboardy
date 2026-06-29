import { AdminLuxuryRouteLoading } from "@/app/admin-luxury-route-loading";

export default async function MembersLoading() {
  return (
    <AdminLuxuryRouteLoading
      kicker="Workspace Directory"
      title={
        <>
          Access <span className="italic opacity-80">&</span> Control
        </>
      }
      subtitle="Loading members, roles, and external asset grants for this workspace."
    />
  );
}
