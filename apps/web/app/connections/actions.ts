"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  RotateConnectionRequest,
  SnowflakeCredentials,
  UpsertConnectionRequest,
} from "@dashboardy/types";

import {
  ApiError,
  rotateWorkspaceConnection,
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

function snowflakeCredentialsFromFields(input: {
  account: string;
  username: string;
  role: string;
  password: string;
  privateKeyPem: string;
  privateKeyPassphrase: string;
}): SnowflakeCredentials {
  const account = input.account.trim();
  const username = input.username.trim();
  const role = input.role.trim();
  const password = input.password;
  const privateKeyPem = input.privateKeyPem.trim();
  const privateKeyPassphrase = input.privateKeyPassphrase;

  if (!account || !username || !role) {
    throw new Error("Account, username, and role are required for credentials.");
  }

  const hasPw = password.trim().length > 0;
  const hasPk = privateKeyPem.length > 0;
  if (hasPw && hasPk) {
    throw new Error("Provide either password or private key PEM, not both.");
  }
  if (!hasPw && !hasPk) {
    throw new Error("Provide either password or private key PEM for Snowflake.");
  }

  const base = { account, username, role };
  if (hasPk) {
    const out: SnowflakeCredentials = {
      ...base,
      private_key_pem: privateKeyPem,
    };
    if (privateKeyPassphrase.trim()) {
      out.private_key_passphrase = privateKeyPassphrase;
    }
    return out;
  }
  return { ...base, password: password.trim() };
}

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
  const privateKeyPem = String(formData.get("private_key_pem") ?? "");
  const privateKeyPassphrase = String(
    formData.get("private_key_passphrase") ?? "",
  );

  if (!name || !warehouse || !database) {
    throw new Error("Name, warehouse, and database are required.");
  }

  const payload: UpsertConnectionRequest = {
    name,
    warehouse,
    database,
    schema: schema ? schema : null,
  };

  const hasAnyCredField = Boolean(
    account || username || password.trim() || role || privateKeyPem.trim(),
  );
  if (hasAnyCredField) {
    payload.credentials = snowflakeCredentialsFromFields({
      account,
      username,
      role,
      password,
      privateKeyPem,
      privateKeyPassphrase,
    });
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

export async function rotateConnectionAction(formData: FormData) {
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  if (!workspaceId || !isUuid(workspaceId)) {
    throw new Error("Invalid workspace id.");
  }

  const account = String(formData.get("rotate_account") ?? "").trim();
  const username = String(formData.get("rotate_username") ?? "").trim();
  const password = String(formData.get("rotate_password") ?? "");
  const role = String(formData.get("rotate_role") ?? "").trim();
  const privateKeyPem = String(formData.get("rotate_private_key_pem") ?? "");
  const privateKeyPassphrase = String(
    formData.get("rotate_private_key_passphrase") ?? "",
  );

  const payload: RotateConnectionRequest = {
    credentials: snowflakeCredentialsFromFields({
      account,
      username,
      role,
      password,
      privateKeyPem,
      privateKeyPassphrase,
    }),
  };

  try {
    const { token } = await requireSessionContext();
    await rotateWorkspaceConnection(token, workspaceId, payload);
    revalidatePath("/connections");
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.message);
    }
    throw err;
  }
}
