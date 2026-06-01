"use server";

import { redirect } from "next/navigation";

import type { AdhocQueryExecuteRequest, QueryExecuteSuccessResponse } from "@dashboardy/types";

import { getProtectedMe } from "@/app/(protected)/data";
import { ApiError } from "@/app/lib/connections-api";
import { executeWorkspaceQuery } from "@/app/lib/query-api";
import { createServerSupabase } from "@/app/lib/supabase-server";

const PREVIEW_ROW_LIMIT = 10;

export type RunQueryFormState =
  | {
      ok: true;
      summary: {
        status: string;
        duration_ms: number;
        truncated: boolean;
        row_count: number;
        cache_hit: boolean;
        error_code?: string;
      };
      rawJson: string;
    }
  | { ok: false; message: string };

export type FullQueryResultState =
  | { ok: true; rawJson: string }
  | { ok: false; message: string };

function toSafeResultPayload(payload: QueryExecuteSuccessResponse) {
  return {
    meta: payload.meta,
    columns: payload.columns,
    preview: payload.rows.slice(0, PREVIEW_ROW_LIMIT),
    preview_row_count: Math.min(payload.rows.length, PREVIEW_ROW_LIMIT),
    total_row_count: payload.rows.length,
  };
}

async function executeAdhocForCurrentWorkspace(sqlText: string) {
  const me = await getProtectedMe();

  const canRunAdhoc =
    me.current_workspace.role === "admin" || me.current_workspace.role === "analyst";
  if (!canRunAdhoc) {
    throw new Error("Only admins and analysts can execute ad hoc SQL from this page.");
  }

  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    redirect("/sign-in");
  }

  const requestBody: AdhocQueryExecuteRequest = {
    mode: "adhoc",
    sql_text: sqlText,
    parameters: {},
    bypass_cache: false,
  };

  return executeWorkspaceQuery(token, me.current_workspace.workspace_id, requestBody);
}

export async function runAdhocQueryAction(
  _prev: RunQueryFormState | null,
  formData: FormData,
): Promise<RunQueryFormState> {
  const sqlTextRaw = formData.get("sql_text");
  const sqlText =
    typeof sqlTextRaw === "string" ? sqlTextRaw.trim() : String(sqlTextRaw ?? "").trim();

  if (!sqlText) {
    return { ok: false, message: "Enter a SQL statement to run." };
  }

  try {
    const payload = await executeAdhocForCurrentWorkspace(sqlText);
    const m = payload.meta;
    return {
      ok: true,
      summary: {
        status: m.status,
        duration_ms: m.duration_ms,
        truncated: m.truncated,
        row_count: m.row_count,
        cache_hit: m.cache_hit,
        error_code: m.error_code ?? undefined,
      },
      rawJson: JSON.stringify(toSafeResultPayload(payload), null, 2),
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

/** Re-runs the query server-side and returns the full API envelope (including all rows). */
export async function fetchFullQueryResultAction(
  _prev: FullQueryResultState | null,
  formData: FormData,
): Promise<FullQueryResultState> {
  const sqlTextRaw = formData.get("sql_text");
  const sqlText =
    typeof sqlTextRaw === "string" ? sqlTextRaw.trim() : String(sqlTextRaw ?? "").trim();

  if (!sqlText) {
    return { ok: false, message: "Enter a SQL statement to run." };
  }

  try {
    const payload = await executeAdhocForCurrentWorkspace(sqlText);
    return { ok: true, rawJson: JSON.stringify(payload, null, 2) };
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
