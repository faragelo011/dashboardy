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
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    redirect("/sign-in");
  }
  const res = await fetchMe(session.access_token);
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
    const body = await res.text().catch(() => "");
    throw new Error(`GET /me failed: ${res.status} ${body}`);
  }
  return (await res.json()) as MeResponse;
});
