/**
 * Web API client for Feature 005 saved questions and collections.
 */

import type {
  Collection,
  CollectionCreateRequest,
  CollectionListResponse,
  CollectionUpdateRequest,
  QueryExecuteSuccessResponse,
  SavedQuestionCloneRequest,
  SavedQuestionCreateRequest,
  SavedQuestionDetail,
  SavedQuestionExecuteRequest,
  SavedQuestionExportQuery,
  SavedQuestionInternalDetail,
  SavedQuestionListQuery,
  SavedQuestionListResponse,
  SavedQuestionUpdateRequest,
} from "@dashboardy/types";

import { ApiError, parseApiErrorBody } from "@/app/lib/connections-api";

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

export async function listCollections(
  accessToken: string,
  workspaceId: string,
): Promise<CollectionListResponse> {
  const res = await apiFetch(workspacePath(workspaceId, "/collections"), accessToken);
  return readJsonOrThrow(res, "Failed to list collections");
}

export async function createCollection(
  accessToken: string,
  workspaceId: string,
  body: CollectionCreateRequest,
): Promise<Collection> {
  const res = await apiFetch(workspacePath(workspaceId, "/collections"), accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return readJsonOrThrow(res, "Failed to create collection");
}

export async function getCollection(
  accessToken: string,
  workspaceId: string,
  collectionId: string,
): Promise<Collection> {
  const res = await apiFetch(
    workspacePath(workspaceId, `/collections/${encodeURIComponent(collectionId)}`),
    accessToken,
  );
  return readJsonOrThrow(res, "Failed to load collection");
}

export async function updateCollection(
  accessToken: string,
  workspaceId: string,
  collectionId: string,
  body: CollectionUpdateRequest,
): Promise<Collection> {
  const res = await apiFetch(
    workspacePath(workspaceId, `/collections/${encodeURIComponent(collectionId)}`),
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  return readJsonOrThrow(res, "Failed to update collection");
}

export async function deleteCollection(
  accessToken: string,
  workspaceId: string,
  collectionId: string,
): Promise<void> {
  const res = await apiFetch(
    workspacePath(workspaceId, `/collections/${encodeURIComponent(collectionId)}`),
    accessToken,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const parsed = parseApiErrorBody(text, "Failed to delete collection");
    throw new ApiError(res.status, parsed.message, parsed.error_code);
  }
}

export async function listSavedQuestions(
  accessToken: string,
  workspaceId: string,
  query?: SavedQuestionListQuery,
): Promise<SavedQuestionListResponse> {
  const params = new URLSearchParams();
  if (query?.collection_id) {
    params.set("collection_id", query.collection_id);
  }
  const qs = params.toString();
  const path = workspacePath(
    workspaceId,
    qs ? `/questions?${qs}` : "/questions",
  );
  const res = await apiFetch(path, accessToken);
  return readJsonOrThrow(res, "Failed to list saved questions");
}

export async function createSavedQuestion(
  accessToken: string,
  workspaceId: string,
  body: SavedQuestionCreateRequest,
): Promise<SavedQuestionInternalDetail> {
  const res = await apiFetch(workspacePath(workspaceId, "/questions"), accessToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return readJsonOrThrow(res, "Failed to create saved question");
}

export async function getSavedQuestion(
  accessToken: string,
  workspaceId: string,
  questionId: string,
): Promise<SavedQuestionDetail> {
  const res = await apiFetch(
    workspacePath(workspaceId, `/questions/${encodeURIComponent(questionId)}`),
    accessToken,
  );
  return readJsonOrThrow(res, "Failed to load saved question");
}

export async function updateSavedQuestion(
  accessToken: string,
  workspaceId: string,
  questionId: string,
  body: SavedQuestionUpdateRequest,
): Promise<SavedQuestionInternalDetail> {
  const res = await apiFetch(
    workspacePath(workspaceId, `/questions/${encodeURIComponent(questionId)}`),
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  return readJsonOrThrow(res, "Failed to update saved question");
}

export async function deleteSavedQuestion(
  accessToken: string,
  workspaceId: string,
  questionId: string,
): Promise<void> {
  const res = await apiFetch(
    workspacePath(workspaceId, `/questions/${encodeURIComponent(questionId)}`),
    accessToken,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const parsed = parseApiErrorBody(text, "Failed to delete saved question");
    throw new ApiError(res.status, parsed.message, parsed.error_code);
  }
}

export async function cloneSavedQuestion(
  accessToken: string,
  workspaceId: string,
  questionId: string,
  body: SavedQuestionCloneRequest,
): Promise<SavedQuestionInternalDetail> {
  const res = await apiFetch(
    workspacePath(
      workspaceId,
      `/questions/${encodeURIComponent(questionId)}/clone`,
    ),
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  return readJsonOrThrow(res, "Failed to clone saved question");
}

export async function executeSavedQuestion(
  accessToken: string,
  workspaceId: string,
  questionId: string,
  body?: SavedQuestionExecuteRequest,
): Promise<QueryExecuteSuccessResponse> {
  const res = await apiFetch(
    workspacePath(
      workspaceId,
      `/questions/${encodeURIComponent(questionId)}/execute`,
    ),
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(body ?? { parameters: {}, bypass_cache: false }),
    },
  );
  return readJsonOrThrow(res, "Failed to execute saved question");
}

function buildSavedQuestionExportQueryString(
  query?: SavedQuestionExportQuery,
): string {
  const params = new URLSearchParams();
  if (query?.bypass_cache) {
    params.set("bypass_cache", "true");
  }
  if (query?.parameters) {
    for (const [name, value] of Object.entries(query.parameters)) {
      params.set(`parameters[${name}]`, String(value));
    }
  }
  return params.toString();
}

export function buildSavedQuestionExportDownloadUrl(
  workspaceId: string,
  questionId: string,
  query?: SavedQuestionExportQuery,
): string {
  const qs = buildSavedQuestionExportQueryString(query);
  return `/api/workspaces/${encodeURIComponent(workspaceId)}/questions/${encodeURIComponent(questionId)}/export${qs ? `?${qs}` : ""}`;
}

export async function exportSavedQuestionCsv(
  accessToken: string,
  workspaceId: string,
  questionId: string,
  query?: SavedQuestionExportQuery,
): Promise<Response> {
  const qs = buildSavedQuestionExportQueryString(query);
  const path = workspacePath(
    workspaceId,
    `/questions/${encodeURIComponent(questionId)}/export.csv${qs ? `?${qs}` : ""}`,
  );
  const res = await fetch(`${apiBase()}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const parsed = parseApiErrorBody(text, "Failed to export saved question");
    throw new ApiError(res.status, parsed.message, parsed.error_code);
  }
  return res;
}

export { ApiError };
