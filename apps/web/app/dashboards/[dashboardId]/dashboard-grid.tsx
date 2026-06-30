type DashboardGridProps = {
  dashboardId: string;
  mode?: "view" | "edit";
};

export function DashboardGrid({ dashboardId, mode = "view" }: DashboardGridProps) {
  return (
    <div
      className="rounded-lg border border-dashed border-[#334155] bg-[#0F172A]/40 p-8 text-center text-sm text-[#94A3B8]"
      data-dashboard-id={dashboardId}
      data-mode={mode}
    >
      Widget grid (scaffold)
    </div>
  );
}
