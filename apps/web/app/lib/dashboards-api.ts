/**
 * Web API client for Feature 006 dashboards.
 *
 * Function names match operation IDs in
 * `specs/006-dashboard-builder/contracts/dashboards.openapi.yaml`.
 */

import type {
  DashboardDetail,
  DashboardSummary,
  DashboardWidgetExportQuery,
  WidgetExecuteResponse,
} from "@dashboardy/types";

const NOT_IMPLEMENTED = "Dashboard API client scaffold — implementation in Phase 3+.";

export async function listDashboards(
  _accessToken: string,
  _workspaceId: string,
  _query?: { collection_id?: string },
): Promise<{ dashboards: DashboardSummary[] }> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function createDashboard(
  _accessToken: string,
  _workspaceId: string,
  _body: unknown,
): Promise<DashboardDetail> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function getDashboard(
  _accessToken: string,
  _workspaceId: string,
  _dashboardId: string,
): Promise<DashboardDetail> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function updateDashboard(
  _accessToken: string,
  _workspaceId: string,
  _dashboardId: string,
  _body: unknown,
): Promise<DashboardDetail> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function deleteDashboard(
  _accessToken: string,
  _workspaceId: string,
  _dashboardId: string,
): Promise<void> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function cloneDashboard(
  _accessToken: string,
  _workspaceId: string,
  _dashboardId: string,
  _body: unknown,
): Promise<DashboardDetail> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function executeDashboardWidget(
  _accessToken: string,
  _workspaceId: string,
  _dashboardId: string,
  _widgetId: string,
  _body?: unknown,
): Promise<WidgetExecuteResponse> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function exportDashboardWidgetCsv(
  _accessToken: string,
  _workspaceId: string,
  _dashboardId: string,
  _widgetId: string,
  _query: DashboardWidgetExportQuery,
): Promise<Response> {
  throw new Error(NOT_IMPLEMENTED);
}
