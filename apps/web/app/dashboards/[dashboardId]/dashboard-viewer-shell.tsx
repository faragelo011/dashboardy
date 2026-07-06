"use client";

import { useState } from "react";

import type { DashboardDetail } from "@dashboardy/types";

import { DashboardFilterBar } from "./dashboard-filter-bar";
import { initialGlobalFilterValues } from "./dashboard-filter-state";
import { DashboardGrid } from "./dashboard-grid";

type DashboardViewerShellProps = {
  accessToken: string;
  workspaceId: string;
  dashboard: DashboardDetail;
};

export function DashboardViewerShell({
  accessToken,
  workspaceId,
  dashboard,
}: DashboardViewerShellProps) {
  const [filterValues, setFilterValues] = useState(() =>
    initialGlobalFilterValues(dashboard.definition.global_filters),
  );

  return (
    <div className="flex flex-col gap-6">
      <DashboardFilterBar
        globalFilters={dashboard.definition.global_filters}
        values={filterValues}
        onChange={setFilterValues}
      />
      <DashboardGrid
        accessToken={accessToken}
        workspaceId={workspaceId}
        dashboardId={dashboard.id}
        widgets={dashboard.widgets}
        mode="view"
        globalFilterValues={filterValues}
      />
    </div>
  );
}
