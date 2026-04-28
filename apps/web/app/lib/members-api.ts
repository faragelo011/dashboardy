import type { MembershipRole, MembershipStatus } from "@dashboardy/types";

export type Member = {
  id: string;
  user_id: string;
  email: string;
  role: MembershipRole;
  status: MembershipStatus;
  created_at: string;
  deactivated_at?: string | null;
};

export type MemberListResponse = { members: Member[] };

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

export async function listWorkspaceMembers(
  accessToken: string,
  workspaceId: string,
): Promise<MemberListResponse> {
  const ws = encodeURIComponent(workspaceId);
  const res = await apiFetch(`/workspaces/${ws}/members`, accessToken);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GET members failed: ${res.status} ${body}`);
  }
  return (await res.json()) as MemberListResponse;
}

export async function inviteWorkspaceMember(
  accessToken: string,
  workspaceId: string,
  payload: { email: string; role: Member["role"] },
): Promise<Member> {
  const ws = encodeURIComponent(workspaceId);
  const res = await apiFetch(`/workspaces/${ws}/members`, accessToken, {
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
      throw new ApiError(res.status, msg, parsed.error_code);
    } catch {
      throw new ApiError(res.status, text || "Invite failed");
    }
  }
  return (await res.json()) as Member;
}

export async function updateWorkspaceMember(
  accessToken: string,
  workspaceId: string,
  membershipId: string,
  payload: { role?: Member["role"]; status?: Member["status"] },
): Promise<Member> {
  const ws = encodeURIComponent(workspaceId);
  const mid = encodeURIComponent(membershipId);
  const res = await apiFetch(
    `/workspaces/${ws}/members/${mid}`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`PATCH member failed: ${res.status} ${body}`);
  }
  return (await res.json()) as Member;
}

