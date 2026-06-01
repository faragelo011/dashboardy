import type {
  ConnectionTestResponse,
  DataConnection,
  RotateConnectionRequest,
  UpsertConnectionRequest,
} from "@dashboardy/types";

export class ApiError extends Error {
  public readonly status: number;
  public readonly errorCode?: string;

  constructor(status: number, message: string, errorCode?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

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
  return fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

export function parseApiErrorBody(
  rawText: string,
  fallbackMessage: string,
): { message: string; error_code?: string } {
  let parsed: {
    error_code?: string;
    message?: string;
    detail?: unknown;
  } | null = null;
  try {
    parsed = JSON.parse(rawText) as {
      error_code?: string;
      message?: string;
      detail?: unknown;
    };
  } catch {
    parsed = null;
  }

  let detailMessage: string | undefined;
  let detailCode: string | undefined;
  if (parsed?.detail !== null && parsed?.detail !== undefined) {
    if (typeof parsed.detail === "string" && parsed.detail.trim()) {
      detailMessage = parsed.detail.trim();
    } else if (
      typeof parsed.detail === "object" &&
      !Array.isArray(parsed.detail)
    ) {
      const d = parsed.detail as { error_code?: string; message?: string };
      if (typeof d.message === "string" && d.message.trim()) {
        detailMessage = d.message.trim();
      }
      if (typeof d.error_code === "string" && d.error_code.trim()) {
        detailCode = d.error_code.trim();
      }
    }
  }

  const message =
    detailMessage ||
    (parsed?.message && typeof parsed.message === "string" && parsed.message.trim()
      ? parsed.message.trim()
      : undefined) ||
    rawText.trim() ||
    fallbackMessage;
  const error_code =
    detailCode ||
    (parsed?.error_code &&
    typeof parsed.error_code === "string" &&
    parsed.error_code.trim()
      ? parsed.error_code.trim()
      : undefined);
  return { message, error_code };
}

export async function getWorkspaceConnection(
  accessToken: string,
  workspaceId: string,
): Promise<DataConnection> {
  const ws = encodeURIComponent(workspaceId);
  const res = await apiFetch(`/workspaces/${ws}/connection`, accessToken);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const parsed = parseApiErrorBody(text, "Failed to load connection");
    throw new ApiError(res.status, parsed.message, parsed.error_code);
  }
  return (await res.json()) as DataConnection;
}
export async function upsertWorkspaceConnection(
  accessToken: string,
  workspaceId: string,
  payload: UpsertConnectionRequest,
): Promise<DataConnection> {
  const ws = encodeURIComponent(workspaceId);
  const res = await apiFetch(`/workspaces/${ws}/connection`, accessToken, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const parsed = parseApiErrorBody(text, "Failed to save connection");
    throw new ApiError(res.status, parsed.message, parsed.error_code);
  }
  return (await res.json()) as DataConnection;
}

export async function testWorkspaceConnection(
  accessToken: string,
  workspaceId: string,
): Promise<ConnectionTestResponse> {
  const ws = encodeURIComponent(workspaceId);
  const res = await apiFetch(`/workspaces/${ws}/connection/test`, accessToken, {
    method: "POST",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const parsed = parseApiErrorBody(text, "Failed to test connection");
    throw new ApiError(res.status, parsed.message, parsed.error_code);
  }
  return (await res.json()) as ConnectionTestResponse;
}

export async function rotateWorkspaceConnection(
  accessToken: string,
  workspaceId: string,
  payload: RotateConnectionRequest,
): Promise<DataConnection> {
  const ws = encodeURIComponent(workspaceId);
  const res = await apiFetch(`/workspaces/${ws}/connection/rotate`, accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const parsed = parseApiErrorBody(text, "Failed to rotate credentials");
    throw new ApiError(res.status, parsed.message, parsed.error_code);
  }
  return (await res.json()) as DataConnection;
}
