type BarWidgetProps = {
  dashboardId: string;
  widgetId: string;
};

export function BarWidget({ dashboardId, widgetId }: BarWidgetProps) {
  return (
    <div
      className="rounded-lg border border-[#1E293B] bg-[#111827]/60 p-4 text-sm text-[#94A3B8]"
      data-dashboard-id={dashboardId}
      data-widget-id={widgetId}
    >
      Bar chart widget (scaffold)
    </div>
  );
}
