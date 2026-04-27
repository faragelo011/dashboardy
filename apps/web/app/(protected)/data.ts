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
  if (res.status === 401 || res.status === 403) {
    redirect("/sign-in");
  }
  if (!res.ok) {
    redirect("/sign-in");
  }
  return (await res.json()) as MeResponse;
});
