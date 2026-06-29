type DashboardEditPageProps = {
  params: { dashboardId: string };
};

export default function DashboardEditPage({ params }: DashboardEditPageProps) {
  const { dashboardId } = params;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] p-8">
      <p className="text-sm text-[#94A3B8]">Dashboard builder (scaffold)</p>
      <p className="text-xs text-[#64748B] mt-2">ID: {dashboardId}</p>
    </div>
  );
}
