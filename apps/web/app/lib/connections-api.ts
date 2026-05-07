import type { DataConnection, UpsertConnectionRequest } from "@dashboardy/types";

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

function parseApiErrorBody(
  rawText: string,
  fallbackMessage: string,
): { message: string; error_code?: string } {
  let parsed: { error_code?: string; message?: string } | null = null;
  try {
    parsed = JSON.parse(rawText) as { error_code?: string; message?: string };
  } catch {
    parsed = null;
  }
  const message =
    parsed && typeof parsed.message === "string" && parsed.message.trim()
      ? parsed.message.trim()
      : rawText.trim() || fallbackMessage;
  const error_code =
    parsed && typeof parsed.error_code === "string" && parsed.error_code.trim()
      ? parsed.error_code.trim()
      : undefined;
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
