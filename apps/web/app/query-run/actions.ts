"use server";

import { redirect } from "next/navigation";

import type { AdhocQueryExecuteRequest } from "@dashboardy/types";

import { getProtectedMe } from "@/app/(protected)/data";
import { ApiError } from "@/app/lib/connections-api";
import { executeWorkspaceQuery } from "@/app/lib/query-api";
import { createServerSupabase } from "@/app/lib/supabase-server";

export type RunQueryFormState =
  | {
      ok: true;
      summary: {
        status: string;
        duration_ms: number;
        truncated: boolean;
        row_count: number;
        cache_hit: boolean;
      };
      rawJson: string;
    }
  | { ok: false; message: string };

export async function runAdhocQueryAction(
  _prev: RunQueryFormState | null,
  formData: FormData,
): Promise<RunQueryFormState> {
  const me = await getProtectedMe();

  if (me.current_workspace.role === "external_client") {
    return {
      ok: false,
      message: "External client accounts cannot execute ad hoc SQL from this page.",
    };
  }

  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    redirect("/sign-in");
  }

  const sqlTextRaw = formData.get("sql_text");
  const sqlText =
    typeof sqlTextRaw === "string" ? sqlTextRaw.trim() : String(sqlTextRaw ?? "").trim();

  if (!sqlText) {
    return { ok: false, message: "Enter a SQL statement to run." };
  }

  const requestBody: AdhocQueryExecuteRequest = {
    mode: "adhoc",
    sql_text: sqlText,
    parameters: {},
    bypass_cache: false,
  };

  try {
    const payload = await executeWorkspaceQuery(
      token,
      me.current_workspace.workspace_id,
      requestBody,
    );
    const m = payload.meta;
    return {
      ok: true,
      summary: {
        status: m.status,
        duration_ms: m.duration_ms,
        truncated: m.truncated,
        row_count: m.row_count,
        cache_hit: m.cache_hit,
      },
      rawJson: JSON.stringify(payload, null, 2),
    };
  } catch (err) {
    if (err instanceof ApiError) {
      const code = err.errorCode ? ` [${err.errorCode}]` : "";
      return { ok: false, message: `${err.message}${code}` };
    }
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Query execution failed.",
    };
  }
}
