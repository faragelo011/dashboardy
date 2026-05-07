"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { UpsertConnectionRequest } from "@dashboardy/types";

import {
  ApiError,
  testWorkspaceConnection,
  upsertWorkspaceConnection,
} from "@/app/lib/connections-api";
import { createServerSupabase } from "@/app/lib/supabase-server";

type SessionContext = { token: string; userId: string };

async function requireSessionContext(): Promise<SessionContext> {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  const userId = session?.user?.id;
  if (!token || !userId) {
    redirect("/sign-in");
  }
  return { token, userId };
}

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );

export async function upsertConnectionAction(formData: FormData) {
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  if (!workspaceId || !isUuid(workspaceId)) {
    throw new Error("Invalid workspace id.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const warehouse = String(formData.get("warehouse") ?? "").trim();
  const database = String(formData.get("database") ?? "").trim();
  const schema = String(formData.get("schema") ?? "").trim();

  const account = String(formData.get("account") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "").trim();

  if (!name || !warehouse || !database) {
    throw new Error("Name, warehouse, and database are required.");
  }

  const payload: UpsertConnectionRequest = {
    name,
    warehouse,
    database,
    schema: schema ? schema : null,
  };

  const hasAnyCredField = Boolean(account || username || password || role);
  if (hasAnyCredField) {
    if (!account || !username || !password || !role) {
      throw new Error(
        "If you provide credentials, account, username, password, and role are all required.",
      );
    }
    payload.credentials = { account, username, password, role };
  }

  try {
    const { token } = await requireSessionContext();
    await upsertWorkspaceConnection(token, workspaceId, payload);
    revalidatePath("/connections");
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.message);
    }
    throw err;
  }
}

export async function testConnectionAction(formData: FormData) {
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  if (!workspaceId || !isUuid(workspaceId)) {
    throw new Error("Invalid workspace id.");
  }

  try {
    const { token } = await requireSessionContext();
    await testWorkspaceConnection(token, workspaceId);
    revalidatePath("/connections");
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.message);
    }
    throw err;
  }
}
