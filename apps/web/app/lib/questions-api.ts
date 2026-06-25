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
  SavedQuestionInternalDetail,
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
  query?: { collection_id?: string },
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

const notImplemented = (operationId: string): never => {
  throw new Error(`${operationId} is not implemented (Feature 005 Phase 4+)`);
};

export async function cloneSavedQuestion(
  _accessToken: string,
  _workspaceId: string,
  _questionId: string,
  _body: SavedQuestionCloneRequest,
): Promise<SavedQuestionInternalDetail> {
  return notImplemented("cloneSavedQuestion");
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

export async function exportSavedQuestionCsv(
  _accessToken: string,
  _workspaceId: string,
  _questionId: string,
  _query?: {
    parameters?: Record<string, string | number | boolean>;
    bypass_cache?: boolean;
  },
): Promise<Blob> {
  return notImplemented("exportSavedQuestionCsv");
}

export { ApiError };
