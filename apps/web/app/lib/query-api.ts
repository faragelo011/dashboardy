import type { AdhocQueryExecuteRequest, QueryExecuteSuccessResponse } from "@dashboardy/types";

import { ApiError, parseApiErrorBody } from "@/app/lib/connections-api";

const apiBase = () => {
  const base = process.env.API_PUBLIC_URL ?? process.env.NEXT_PUBLIC_API_PUBLIC_URL;
  if (!base) {
    throw new Error("API_PUBLIC_URL or NEXT_PUBLIC_API_PUBLIC_URL must be set");
  }
  return base.replace(/\/$/, "");
};

export async function executeWorkspaceQuery(
  accessToken: string,
  workspaceId: string,
  body: AdhocQueryExecuteRequest | Record<string, unknown>,
): Promise<QueryExecuteSuccessResponse> {
  const ws = encodeURIComponent(workspaceId);
  const res = await fetch(`${apiBase()}/workspaces/${ws}/query/execute`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    const parsed = parseApiErrorBody(text, "Query execution failed");
    throw new ApiError(res.status, parsed.message, parsed.error_code);
  }
  try {
    return JSON.parse(text) as QueryExecuteSuccessResponse;
  } catch {
    throw new ApiError(500, "Query API returned non-JSON body", undefined);
  }
}

export type { QueryExecuteSuccessResponse };
