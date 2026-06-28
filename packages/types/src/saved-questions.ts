/**
 * Hand-aligned with
 * `specs/005-saved-questions-collections/contracts/saved-questions.openapi.yaml`
 * (Dashboardy Feature 5). Prefer importing from `@dashboardy/types` in web/API clients.
 */

export type GrantPermission = "view" | "edit";

export type ParameterType = "string" | "number" | "boolean" | "date";

export type ParameterDefinition = {
  name: string;
  type: ParameterType;
  required: boolean;
  label?: string | null;
  default?: string | number | boolean | null;
};

export type Collection = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  sort_order: number;
  permission: GrantPermission;
  created_at: string;
  updated_at: string;
};

export type CollectionCreateRequest = {
  name: string;
  sort_order?: number;
};

export type CollectionUpdateRequest = {
  expected_updated_at: string;
  name?: string;
  sort_order?: number;
};

export type CollectionResponse = Collection;

export type CollectionListResponse = {
  collections: Collection[];
};

export type SavedQuestionSummary = {
  id: string;
  collection_id: string;
  title: string;
  description?: string | null;
  permission: GrantPermission;
  can_export?: boolean;
  created_at: string;
  updated_at: string;
};

export type SavedQuestionDetailLevel = "consumer" | "internal";

export type SavedQuestionConsumerDetail = SavedQuestionSummary & {
  detail_level: "consumer";
  parameters: ParameterDefinition[];
};

export type SavedQuestionInternalDetail = SavedQuestionSummary & {
  detail_level: "internal";
  parameters: ParameterDefinition[];
  sql_text: string;
};

export type SavedQuestionDetail =
  | SavedQuestionConsumerDetail
  | SavedQuestionInternalDetail;

export type SavedQuestionCreateRequest = {
  collection_id: string;
  title: string;
  sql_text: string;
  parameters: ParameterDefinition[];
  description?: string | null;
};

export type SavedQuestionUpdateRequest = {
  expected_updated_at: string;
  collection_id?: string;
  title?: string;
  description?: string | null;
  sql_text?: string;
  parameters?: ParameterDefinition[];
};

export type SavedQuestionCloneRequest = {
  target_collection_id: string;
  title?: string | null;
};

export type SavedQuestionExecuteRequest = {
  parameters?: Record<string, unknown>;
  bypass_cache?: boolean;
};

export type SavedQuestionExportQuery = {
  parameters?: Record<string, string | number | boolean>;
  bypass_cache?: boolean;
};

export type SavedQuestionListQuery = {
  collection_id?: string;
};

export type SavedQuestionListResponse = {
  questions: SavedQuestionSummary[];
};

export type SavedQuestionsNormalizedErrorCode =
  | "authz_denied"
  | "duplicate_collection_name"
  | "collection_not_empty"
  | "stale_update"
  | "invalid_parameters"
  | "export_not_permitted"
  | "question_not_found"
  | "collection_not_found"
  | "validation_error";

export type SavedQuestionsNormalizedError = {
  error_code: SavedQuestionsNormalizedErrorCode | string;
  message: string;
  details?: Record<string, unknown> | null;
};
