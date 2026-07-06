/**
 * Web API client for Feature 006 dashboards.
 */

import type {
  DashboardCloneRequest,
  DashboardCreateRequest,
  DashboardDetail,
  DashboardListQuery,
  DashboardListResponse,
  DashboardUpdateRequest,
  DashboardWidgetExportQuery,
  WidgetExecuteRequest,
  WidgetExecuteResponse,
} from "@dashboardy/types";

import { ApiError, parseApiErrorBody } from "@/app/lib/connections-api";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

const apiBase = () => {
  const base = process.env.API_PUBLIC_URL ?? process.env.NEXT_PUBLIC_API_PUBLIC_URL;
  if (!base) {
    throw new Error("API_PUBLIC_URL or NEXT_PUBLIC_API_PUBLIC_URL must be set");
  }
  return base.replace(/\/$/, "");
};

async function apiFetch(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function readJsonOrThrow<T>(
  res: Response,
  fallbackMessage: string,
): Promise<T> {
  if (res.ok) {
    return (await res.json()) as T;
  }
  const text = await res.text().catch(() => "");
  const parsed = parseApiErrorBody(text, fallbackMessage);
  throw new ApiError(res.status, parsed.message, parsed.error_code);
}

function workspacePath(workspaceId: string, suffix: string): string {
  const ws = encodeURIComponent(workspaceId);
  return `/workspaces/${ws}${suffix}`;
}

export async function listDashboards(
  accessToken: string,
  workspaceId: string,
  query?: DashboardListQuery,
): Promise<DashboardListResponse> {
  const params = new URLSearchParams();
  if (query?.collection_id) {
    params.set("collection_id", query.collection_id);
  }
  const qs = params.toString();
  const path = workspacePath(
    workspaceId,
    qs ? `/dashboards?${qs}` : "/dashboards",
  );
  const res = await apiFetch(path, accessToken);
  return readJsonOrThrow(res, "Failed to list dashboards");
}

export async function createDashboard(
  accessToken: string,
  workspaceId: string,
  body: DashboardCreateRequest,
): Promise<DashboardDetail> {
  const res = await apiFetch(workspacePath(workspaceId, "/dashboards"), accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return readJsonOrThrow(res, "Failed to create dashboard");
}

export async function getDashboard(
  accessToken: string,
  workspaceId: string,
  dashboardId: string,
): Promise<DashboardDetail> {
  const res = await apiFetch(
    workspacePath(workspaceId, `/dashboards/${encodeURIComponent(dashboardId)}`),
    accessToken,
  );
  return readJsonOrThrow(res, "Failed to load dashboard");
}

export async function updateDashboard(
  accessToken: string,
  workspaceId: string,
  dashboardId: string,
  body: DashboardUpdateRequest,
): Promise<DashboardDetail> {
  const res = await apiFetch(
    workspacePath(workspaceId, `/dashboards/${encodeURIComponent(dashboardId)}`),
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  return readJsonOrThrow(res, "Failed to update dashboard");
}

export async function deleteDashboard(
  accessToken: string,
  workspaceId: string,
  dashboardId: string,
): Promise<void> {
  const res = await apiFetch(
    workspacePath(workspaceId, `/dashboards/${encodeURIComponent(dashboardId)}`),
    accessToken,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const parsed = parseApiErrorBody(text, "Failed to delete dashboard");
    throw new ApiError(res.status, parsed.message, parsed.error_code);
  }
}

export async function cloneDashboard(
  accessToken: string,
  workspaceId: string,
  dashboardId: string,
  body: DashboardCloneRequest,
): Promise<DashboardDetail> {
  const res = await apiFetch(
    workspacePath(
      workspaceId,
      `/dashboards/${encodeURIComponent(dashboardId)}/clone`,
    ),
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  return readJsonOrThrow(res, "Failed to clone dashboard");
}

export async function executeDashboardWidget(
  accessToken: string,
  workspaceId: string,
  dashboardId: string,
  widgetId: string,
  body?: WidgetExecuteRequest,
): Promise<WidgetExecuteResponse> {
  const res = await apiFetch(
    workspacePath(
      workspaceId,
      `/dashboards/${encodeURIComponent(dashboardId)}/widgets/${encodeURIComponent(widgetId)}/execute`,
    ),
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(
        body ?? { global_filter_values: {}, bypass_cache: false },
      ),
    },
  );
  return readJsonOrThrow(res, "Failed to execute dashboard widget");
}

/**
 * Download a table widget CSV. `filter_state` must be URL-encoded JSON:
 * `{ "global_filter_values": { ... } }` (see `FilterStateExport` in `@dashboardy/types`).
 */
export async function exportDashboardWidgetCsv(
  accessToken: string,
  workspaceId: string,
  dashboardId: string,
  widgetId: string,
  query: DashboardWidgetExportQuery,
): Promise<Response> {
  const params = new URLSearchParams();
  params.set("filter_state", query.filter_state);
  if (query.bypass_cache) {
    params.set("bypass_cache", "true");
  }
  const path = workspacePath(
    workspaceId,
    `/dashboards/${encodeURIComponent(dashboardId)}/widgets/${encodeURIComponent(widgetId)}/export.csv?${params.toString()}`,
  );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const parsed = parseApiErrorBody(text, "Failed to export dashboard widget");
    throw new ApiError(res.status, parsed.message, parsed.error_code);
  }
  return res;
}

export { ApiError };
