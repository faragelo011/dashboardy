"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabase } from "@/app/lib/supabase-server";
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

