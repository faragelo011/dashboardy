import { cache } from "react";
import { redirect } from "next/navigation";

import { fetchMe } from "@/app/lib/api";
import { createServerSupabase } from "@/app/lib/supabase-server";

export type MeResponse = {
  user: { id: string; email: string };
  current_workspace: {
    tenant_id: string;
    workspace_id: string;
    workspace_name: string;
    role: string;
    membership_status: string;
  };
  workspaces: {
    tenant_id: string;
    workspace_id: string;
    workspace_name: string;
    role: string;
    membership_status: string;
  }[];
};

export const getProtectedMe = cache(async (): Promise<MeResponse> => {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  ) {
    console.error(
      "[dashboardy] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — server cannot authenticate requests.",
    );
    redirect("/sign-in");
  }
  const apiBaseCandidate = (
    process.env.API_PUBLIC_URL ?? process.env.NEXT_PUBLIC_API_PUBLIC_URL
  )?.trim();
  if (!apiBaseCandidate) {
    console.error(
      "[dashboardy] Missing API_PUBLIC_URL or NEXT_PUBLIC_API_PUBLIC_URL — server cannot fetch /me.",
    );
    redirect("/sign-in");
  }

  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    redirect("/sign-in");
  }

  let res: Response;
  try {
    res = await fetchMe(session.access_token);
  } catch (err) {
    console.error("[dashboardy] fetch GET /me failed before HTTP response:", err);
    redirect("/sign-in");
  }

  if (res.status === 401) {
    redirect("/sign-in");
  }
  if (res.status === 403) {
    const bodyText = await res.text().catch(() => "");
    try {
      const parsed = JSON.parse(bodyText) as {
        error_code?: unknown;
        detail?: { error_code?: unknown } | unknown;
      };
      const detailCode =
        parsed.detail && typeof parsed.detail === "object"
          ? "error_code" in parsed.detail
            ? (parsed.detail as { error_code?: unknown }).error_code
            : undefined
          : undefined;
      const code =
        parsed.error_code ?? detailCode;
      if (code === "password_reset_required") {
        redirect("/set-password");
      }
    } catch {
      // ignore parse failures; fall through to sign-in redirect
    }
    redirect("/sign-in");
  }
  if (!res.ok) {
    let safeError = "unparseable error body";
    try {
      const text = await res.text();
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed?.detail?.error_code) {
          safeError = parsed.detail.error_code;
        } else if (parsed?.detail?.message) {
          safeError = parsed.detail.message;
        }
      }
    } catch {
      // ignore
    }
    console.error("[dashboardy] GET /me failed:", res.status, safeError);
    redirect("/sign-in");
  }

  let me: MeResponse;
  try {
    me = (await res.json()) as MeResponse;
  } catch (err) {
    console.error("[dashboardy] GET /me returned non-JSON:", err);
    redirect("/sign-in");
  }

  if (
    !me?.current_workspace?.workspace_id ||
    typeof me.current_workspace.role !== "string" ||
    !me?.user?.id
  ) {
    console.error("[dashboardy] GET /me returned an unexpected payload shape.");
    redirect("/sign-in");
  }

  return me;
});
