import type { AssetType } from "@dashboardy/types";

export type AssetGrant = {
  id: string;
  user_id: string;
  asset_type: AssetType;
  asset_id: string;
  can_export: boolean;
  created_at: string;
};

export type AssetGrantListResponse = { grants: AssetGrant[] };

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

export async function listExternalAssetGrants(
  accessToken: string,
  workspaceId: string,
  filters?: { user_id?: string; asset_type?: AssetType },
): Promise<AssetGrantListResponse> {
  const ws = encodeURIComponent(workspaceId);
  const params = new URLSearchParams();
  if (filters?.user_id) params.set("user_id", filters.user_id);
  if (filters?.asset_type) params.set("asset_type", filters.asset_type);
  const qs = params.toString();

  const res = await apiFetch(
    `/workspaces/${ws}/asset-grants${qs ? `?${qs}` : ""}`,
    accessToken,
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(
      res.status,
      `GET asset grants failed: ${res.status} ${body}`,
    );
  }
  return (await res.json()) as AssetGrantListResponse;
}

export async function createExternalAssetGrant(
  accessToken: string,
  workspaceId: string,
  payload: {
    user_id: string;
    asset_type: AssetType;
    asset_id: string;
    can_export?: boolean;
  },
): Promise<AssetGrant> {
  const ws = encodeURIComponent(workspaceId);
  const res = await apiFetch(`/workspaces/${ws}/asset-grants`, accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    try {
      const parsed = JSON.parse(text) as { error_code?: string; message?: string };
      const msg =
        typeof parsed.message === "string" && parsed.message.trim()
          ? parsed.message
          : text;
      const errorCode =
        typeof parsed.error_code === "string" && parsed.error_code.trim()
          ? parsed.error_code
          : undefined;
      throw new ApiError(res.status, msg, errorCode);
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(res.status, text || "Create asset grant failed");
    }
  }
  return (await res.json()) as AssetGrant;
}

export async function deleteExternalAssetGrant(
  accessToken: string,
  workspaceId: string,
  grantId: string,
): Promise<void> {
  const ws = encodeURIComponent(workspaceId);
  const gid = encodeURIComponent(grantId);
  const res = await apiFetch(`/workspaces/${ws}/asset-grants/${gid}`, accessToken, {
    method: "DELETE",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(
      res.status,
      `DELETE asset grant failed: ${res.status} ${body}`,
    );
  }
}

