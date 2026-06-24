/**
 * Web API client for Feature 005 saved questions and collections.
 * Function names match OpenAPI operationIds in saved-questions.openapi.yaml.
 * Implementation lands in Phase 3+; Phase 1 only scaffolds exports.
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

const notImplemented = (operationId: string): never => {
  throw new Error(`${operationId} is not implemented (Feature 005 Phase 1 scaffold)`);
};

export async function listCollections(
  _accessToken: string,
  _workspaceId: string,
): Promise<CollectionListResponse> {
  return notImplemented("listCollections");
}

export async function createCollection(
  _accessToken: string,
  _workspaceId: string,
  _body: CollectionCreateRequest,
): Promise<Collection> {
  return notImplemented("createCollection");
}

export async function getCollection(
  _accessToken: string,
  _workspaceId: string,
  _collectionId: string,
): Promise<Collection> {
  return notImplemented("getCollection");
}

export async function updateCollection(
  _accessToken: string,
  _workspaceId: string,
  _collectionId: string,
  _body: CollectionUpdateRequest,
): Promise<Collection> {
  return notImplemented("updateCollection");
}

export async function deleteCollection(
  _accessToken: string,
  _workspaceId: string,
  _collectionId: string,
): Promise<void> {
  return notImplemented("deleteCollection");
}

export async function listSavedQuestions(
  _accessToken: string,
  _workspaceId: string,
  _query?: { collection_id?: string },
): Promise<SavedQuestionListResponse> {
  return notImplemented("listSavedQuestions");
}

export async function createSavedQuestion(
  _accessToken: string,
  _workspaceId: string,
  _body: SavedQuestionCreateRequest,
): Promise<SavedQuestionInternalDetail> {
  return notImplemented("createSavedQuestion");
}

export async function getSavedQuestion(
  _accessToken: string,
  _workspaceId: string,
  _questionId: string,
): Promise<SavedQuestionDetail> {
  return notImplemented("getSavedQuestion");
}

export async function updateSavedQuestion(
  _accessToken: string,
  _workspaceId: string,
  _questionId: string,
  _body: SavedQuestionUpdateRequest,
): Promise<SavedQuestionInternalDetail> {
  return notImplemented("updateSavedQuestion");
}

export async function deleteSavedQuestion(
  _accessToken: string,
  _workspaceId: string,
  _questionId: string,
): Promise<void> {
  return notImplemented("deleteSavedQuestion");
}

export async function cloneSavedQuestion(
  _accessToken: string,
  _workspaceId: string,
  _questionId: string,
  _body: SavedQuestionCloneRequest,
): Promise<SavedQuestionInternalDetail> {
  return notImplemented("cloneSavedQuestion");
}

export async function executeSavedQuestion(
  _accessToken: string,
  _workspaceId: string,
  _questionId: string,
  _body?: SavedQuestionExecuteRequest,
): Promise<QueryExecuteSuccessResponse> {
  return notImplemented("executeSavedQuestion");
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
