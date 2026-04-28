type Member = {
  id: string;
  user_id: string;
  email: string;
  role: "admin" | "analyst" | "viewer" | "external_client";
  status: "active" | "inactive";
  created_at: string;
  deactivated_at?: string | null;
};

export type MemberListResponse = { members: Member[] };

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
  const res = await apiFetch(`/workspaces/${workspaceId}/members`, accessToken);
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
  const res = await apiFetch(`/workspaces/${workspaceId}/members`, accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`POST members failed: ${res.status} ${body}`);
  }
  return (await res.json()) as Member;
}

export async function updateWorkspaceMember(
  accessToken: string,
  workspaceId: string,
  membershipId: string,
  payload: { role?: Member["role"]; status?: Member["status"] },
): Promise<Member> {
  const res = await apiFetch(
    `/workspaces/${workspaceId}/members/${membershipId}`,
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

