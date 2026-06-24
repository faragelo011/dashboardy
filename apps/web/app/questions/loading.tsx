import { AdminLuxuryRouteLoading } from "@/app/admin-luxury-route-loading";

export default async function QuestionsLoading() {
  return (
    <AdminLuxuryRouteLoading
      kicker="Saved Questions"
      title={
        <>
          Saved <span className="italic opacity-80">Questions</span>
        </>
      }
      subtitle="Loading governed questions and parameter definitions."
    />
  );
}
