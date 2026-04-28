"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabase } from "@/app/lib/supabase-server";
import {
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
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "viewer") as
    | "admin"
    | "analyst"
    | "viewer"
    | "external_client";
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();

  const token = await requireAccessToken();
  await inviteWorkspaceMember(token, workspaceId, { email, role });
  revalidatePath("/members");
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

