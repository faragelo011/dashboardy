"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabase } from "@/app/lib/supabase-server";
import {
  ApiError,
  createSavedQuestion,
  deleteSavedQuestion,
  updateSavedQuestion,
} from "@/app/lib/questions-api";
import type { ParameterDefinition } from "@dashboardy/types";

async function requireToken(): Promise<string> {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    redirect("/sign-in");
  }
  return token;
}

function parseParameters(raw: string): ParameterDefinition[] {
  if (!raw.trim()) {
    return [];
  }
  const parsed = JSON.parse(raw) as ParameterDefinition[];
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid parameter schema.");
  }
  return parsed;
}

export type QuestionActionState =
  | { ok: true; questionId?: string; updatedAt?: string }
  | { ok: false; message: string; errorCode?: string };

export async function saveQuestionAction(
  _prev: QuestionActionState | null,
  formData: FormData,
): Promise<QuestionActionState> {
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  const collectionId = String(formData.get("collection_id") ?? "").trim();
  const questionId = String(formData.get("question_id") ?? "").trim();
  const expectedUpdatedAt = String(formData.get("expected_updated_at") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sqlText = String(formData.get("sql_text") ?? "").trim();
  const parametersRaw = String(formData.get("parameters_json") ?? "[]");

  if (!workspaceId || !collectionId || !title || !sqlText) {
    return { ok: false, message: "Title, collection, and SQL are required." };
  }

  let parameters: ParameterDefinition[];
  try {
    parameters = parseParameters(parametersRaw);
  } catch {
    return { ok: false, message: "Parameter schema is invalid." };
  }

  const token = await requireToken();
  try {
    if (questionId) {
      if (!expectedUpdatedAt) {
        return { ok: false, message: "Missing expected update timestamp." };
      }
      const updated = await updateSavedQuestion(token, workspaceId, questionId, {
        expected_updated_at: expectedUpdatedAt,
        collection_id: collectionId,
        title,
        description: description || null,
        sql_text: sqlText,
        parameters,
      });
      revalidatePath("/questions");
      return { ok: true, questionId, updatedAt: updated.updated_at };
    }

    const created = await createSavedQuestion(token, workspaceId, {
      collection_id: collectionId,
      title,
      description: description || null,
      sql_text: sqlText,
      parameters,
    });
    revalidatePath("/questions");
    return { ok: true, questionId: created.id, updatedAt: created.updated_at };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, message: err.message, errorCode: err.errorCode };
    }
    return { ok: false, message: "Failed to save question." };
  }
}

export async function deleteQuestionAction(formData: FormData): Promise<QuestionActionState> {
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  const questionId = String(formData.get("question_id") ?? "").trim();
  if (!workspaceId || !questionId) {
    return { ok: false, message: "Missing question identifier." };
  }

  const token = await requireToken();
  try {
    await deleteSavedQuestion(token, workspaceId, questionId);
    revalidatePath("/questions");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, message: err.message, errorCode: err.errorCode };
    }
    return { ok: false, message: "Failed to delete question." };
  }
}
