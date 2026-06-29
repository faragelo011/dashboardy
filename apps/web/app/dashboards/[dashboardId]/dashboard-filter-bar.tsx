type DashboardFilterBarProps = {
  dashboardId: string;
};

export function DashboardFilterBar({ dashboardId }: DashboardFilterBarProps) {
  return (
    <div
      className="rounded-lg border border-[#1E293B] bg-[#111827]/60 px-4 py-3 text-sm text-[#94A3B8]"
      data-dashboard-id={dashboardId}
    >
      Global filters (scaffold)
    </div>
  );
}
