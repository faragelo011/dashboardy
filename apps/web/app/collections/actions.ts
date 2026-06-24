"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabase } from "@/app/lib/supabase-server";
import {
  ApiError,
  createCollection,
  deleteCollection,
  updateCollection,
} from "@/app/lib/questions-api";

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

export type CollectionActionState =
  | { ok: true }
  | { ok: false; message: string; errorCode?: string };

export async function createCollectionAction(
  _prev: CollectionActionState | null,
  formData: FormData,
): Promise<CollectionActionState> {
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const sortOrderRaw = String(formData.get("sort_order") ?? "0").trim();
  const sortOrder = Number.parseInt(sortOrderRaw, 10);

  if (!workspaceId || !name) {
    return { ok: false, message: "Collection name is required." };
  }

  const token = await requireToken();
  try {
    await createCollection(token, workspaceId, {
      name,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    });
    revalidatePath("/collections");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, message: err.message, errorCode: err.errorCode };
    }
    return { ok: false, message: "Failed to create collection." };
  }
}

export async function updateCollectionAction(
  _prev: CollectionActionState | null,
  formData: FormData,
): Promise<CollectionActionState> {
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  const collectionId = String(formData.get("collection_id") ?? "").trim();
  const expectedUpdatedAt = String(formData.get("expected_updated_at") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const sortOrderRaw = String(formData.get("sort_order") ?? "").trim();

  if (!workspaceId || !collectionId || !expectedUpdatedAt || !name) {
    return { ok: false, message: "Missing collection update fields." };
  }

  const sortOrder = sortOrderRaw ? Number.parseInt(sortOrderRaw, 10) : undefined;
  const token = await requireToken();
  try {
    await updateCollection(token, workspaceId, collectionId, {
      expected_updated_at: expectedUpdatedAt,
      name,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : undefined,
    });
    revalidatePath("/collections");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, message: err.message, errorCode: err.errorCode };
    }
    return { ok: false, message: "Failed to update collection." };
  }
}

export async function deleteCollectionAction(formData: FormData): Promise<CollectionActionState> {
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  const collectionId = String(formData.get("collection_id") ?? "").trim();
  if (!workspaceId || !collectionId) {
    return { ok: false, message: "Missing collection identifier." };
  }

  const token = await requireToken();
  try {
    await deleteCollection(token, workspaceId, collectionId);
    revalidatePath("/collections");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, message: err.message, errorCode: err.errorCode };
    }
    return { ok: false, message: "Failed to delete collection." };
  }
}
