import { notFound, redirect } from "next/navigation";

import { AdminLuxuryNav } from "@/app/admin-luxury-nav";
import { getProtectedMe } from "@/app/(protected)/data";
import { getDashboard } from "@/app/lib/dashboards-api";
import { getSavedQuestion, listCollections, listSavedQuestions } from "@/app/lib/questions-api";
import { createServerSupabase } from "@/app/lib/supabase-server";
import type { ParameterDefinition, SavedQuestionInternalDetail } from "@dashboardy/types";

import { DashboardBuilder } from "../dashboard-builder";

type PageProps = {
  params: Promise<{ dashboardId: string }>;
};

export default async function DashboardEditPage({ params }: PageProps) {
  const { dashboardId } = await params;
  const me = await getProtectedMe();
  const role = me.current_workspace.role;
  if (role !== "admin" && role !== "analyst") {
    redirect(`/dashboards/${dashboardId}`);
  }

  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    redirect("/sign-in");
  }

  const workspaceId = me.current_workspace.workspace_id;

  let dashboard: Awaited<ReturnType<typeof getDashboard>>;
  let collectionsResp: Awaited<ReturnType<typeof listCollections>>;
  let questionsResp: Awaited<ReturnType<typeof listSavedQuestions>>;

  try {
    [dashboard, collectionsResp, questionsResp] = await Promise.all([
      getDashboard(token, workspaceId, dashboardId),
      listCollections(token, workspaceId),
      listSavedQuestions(token, workspaceId),
    ]);
  } catch (err) {
    console.error("failed to load dashboard builder", { workspaceId, dashboardId, err });
    notFound();
  }

  if (dashboard.detail_level !== "editor" || !dashboard.can_edit) {
    redirect(`/dashboards/${dashboardId}`);
  }

  const questionIds = Array.from(
    new Set(dashboard.widgets.map((w) => w.saved_question_id)),
  );
  const questionParametersById: Record<string, ParameterDefinition[]> = {};
  await Promise.all(
    questionIds.map(async (id) => {
      try {
        const detail = await getSavedQuestion(token, workspaceId, id);
        if (detail.detail_level === "internal") {
          questionParametersById[detail.id] = (
            detail as SavedQuestionInternalDetail
          ).parameters;
        }
      } catch (err) {
        console.error("failed to load saved question for bindings", { id, err });
      }
    }),
  );

  const editableCollections = collectionsResp.collections.filter(
    (c) => c.permission === "edit",
  );

  return (
    <div className="min-h-screen bg-surface-app text-ink">
      <AdminLuxuryNav />
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-8 lg:py-14">
        <header className="space-y-2 border-b border-border-1 pb-6">
          <p className="ds-kicker">Dashboard builder</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-strong sm:text-3xl">
            Edit dashboard
          </h1>
        </header>
        <DashboardBuilder
          accessToken={token}
          workspaceId={workspaceId}
          initial={dashboard}
          collections={editableCollections}
          questions={questionsResp.questions}
          questionParametersById={questionParametersById}
        />
      </div>
    </div>
  );
}
