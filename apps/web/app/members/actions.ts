"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabase } from "@/app/lib/supabase-server";
import {
  ApiError as AssetGrantApiError,
  createExternalAssetGrant,
  deleteExternalAssetGrant,
} from "@/app/lib/asset-grants-api";
import {
  ApiError,
  inviteWorkspaceMember,
  updateWorkspaceMember,
} from "@/app/lib/members-api";

async function requireAccessToken(): Promise<string> {
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

export async function inviteMemberAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  const rawRole = String(formData.get("role") ?? "viewer").trim();

  if (!email) {
    throw new Error("Email is required.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid email address.");
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      workspaceId,
    )
  ) {
    throw new Error("Invalid workspace id.");
  }

  const role =
    rawRole === "admin" ||
    rawRole === "analyst" ||
    rawRole === "viewer" ||
    rawRole === "external_client"
      ? rawRole
      : "viewer";

  try {
    const token = await requireAccessToken();
    await inviteWorkspaceMember(token, workspaceId, { email, role });
    revalidatePath("/members");
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.message);
    }
    throw err;
  }
}

export async function updateMemberRoleAction(formData: FormData) {
  const membershipId = String(formData.get("membership_id") ?? "").trim();
  const role = String(formData.get("role") ?? "viewer") as
    | "admin"
    | "analyst"
    | "viewer"
    | "external_client";
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();

  const token = await requireAccessToken();
  await updateWorkspaceMember(token, workspaceId, membershipId, { role });
  revalidatePath("/members");
}

export async function deactivateMemberAction(formData: FormData) {
  const membershipId = String(formData.get("membership_id") ?? "").trim();
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();

  const token = await requireAccessToken();
  await updateWorkspaceMember(token, workspaceId, membershipId, {
    status: "inactive",
  });
  revalidatePath("/members");
}

export async function createAssetGrantAction(formData: FormData) {
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();
  const assetId = String(formData.get("asset_id") ?? "").trim();
  const assetType = String(formData.get("asset_type") ?? "dashboard").trim();
  const canExport = String(formData.get("can_export") ?? "") === "on";

  if (!workspaceId || !userId || !assetId) {
    throw new Error("workspace_id, user_id, and asset_id are required.");
  }
  const isUuid = (v: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v,
    );
  if (!isUuid(workspaceId)) throw new Error("Invalid workspace id.");
  if (!isUuid(userId)) throw new Error("Invalid user id.");
  if (!isUuid(assetId)) throw new Error("Invalid asset id.");
  if (assetType !== "question" && assetType !== "dashboard") {
    throw new Error("Invalid asset type.");
  }

  try {
    const token = await requireAccessToken();
    await createExternalAssetGrant(token, workspaceId, {
      user_id: userId,
      asset_type: assetType,
      asset_id: assetId,
      can_export: canExport,
    });
    revalidatePath("/members");
  } catch (err) {
    if (err instanceof AssetGrantApiError) {
      throw new Error(err.message);
    }
    throw err;
  }
}

export async function deleteAssetGrantAction(formData: FormData) {
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  const grantId = String(formData.get("grant_id") ?? "").trim();

  const token = await requireAccessToken();
  await deleteExternalAssetGrant(token, workspaceId, grantId);
  revalidatePath("/members");
}

