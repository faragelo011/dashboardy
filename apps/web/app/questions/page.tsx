import Link from "next/link";
import { redirect } from "next/navigation";
import { FileCode2, Plus } from "lucide-react";

import { AdminLuxuryNav } from "@/app/admin-luxury-nav";
import { getProtectedMe } from "@/app/(protected)/data";
import {
  ApiError,
  getSavedQuestion,
  listCollections,
  listSavedQuestions,
} from "@/app/lib/questions-api";
import { createServerSupabase } from "@/app/lib/supabase-server";
import type { SavedQuestionDetail } from "@dashboardy/types";
import { DsIcon } from "@/components/ds/icon";
import { EmptyState } from "@/components/ds/empty-state";

import { QuestionEditor } from "./question-editor";
import { QuestionRow } from "./question-row";

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }
  const trimmed = value?.trim();
  return trimmed || undefined;
}

type PageProps = {
  searchParams: Promise<{ id?: string | string[]; new?: string | string[] }>;
};

export default async function QuestionsPage({ searchParams }: PageProps) {
  const me = await getProtectedMe();
  const role = me.current_workspace.role;
  if (role === "external_client") {
    redirect("/dashboards");
  }

  const roleCanAuthor = role === "admin" || role === "analyst";
  const params = await searchParams;
  const editingId = firstSearchParam(params.id);
  const isNew = firstSearchParam(params.new) === "1";

  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    redirect("/sign-in");
  }

  const workspaceId = me.current_workspace.workspace_id;
  let collections: Awaited<ReturnType<typeof listCollections>>["collections"] = [];
  let questions: Awaited<ReturnType<typeof listSavedQuestions>>["questions"] = [];
  let loadedDetail: SavedQuestionDetail | null = null;
  let listLoadError: string | null = null;
  let questionLoadError: string | null = null;

  try {
    const [collectionsResp, questionsResp] = await Promise.all([
      listCollections(token, workspaceId),
      listSavedQuestions(token, workspaceId),
    ]);
    collections = collectionsResp.collections;
    questions = questionsResp.questions;
  } catch (err) {
    console.error("failed to load questions list", { workspaceId, err });
    listLoadError = "Failed to load saved questions. Please refresh and try again.";
  }

  if (editingId) {
    try {
      loadedDetail = await getSavedQuestion(token, workspaceId, editingId);
    } catch (err) {
      console.error("failed to load saved question", { workspaceId, editingId, err });
      if (err instanceof ApiError) {
        questionLoadError = err.message;
      } else {
        questionLoadError = "Failed to load this question. Please try again.";
      }
    }
  }

  const showNewEditor = isNew && roleCanAuthor;
  const showEditEditor = Boolean(editingId && loadedDetail);
  const showEditor = showNewEditor || showEditEditor;
  const editorCanEdit = showNewEditor
    ? true
    : loadedDetail?.permission === "edit";

  const collectionNameById = new Map(collections.map((c) => [c.id, c.name]));

  if (showEditor) {
    return (
      <div className="min-h-screen bg-surface-app text-ink">
        <AdminLuxuryNav />
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-8 lg:py-10">
          {editingId && questionLoadError ? (
            <div className="dby-alert dby-alert--danger" role="alert">
              <div className="dby-alert__body">
                <p className="text-sm">{questionLoadError}</p>
                <Link
                  href="/questions"
                  className="mt-3 inline-block text-sm font-medium text-accent hover:text-accent-hover"
                >
                  Back to list
                </Link>
              </div>
            </div>
          ) : (
            <QuestionEditor
              workspaceId={workspaceId}
              collections={collections}
              detail={showNewEditor ? null : loadedDetail}
              isNew={showNewEditor}
              canEdit={editorCanEdit}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-app text-ink">
      <AdminLuxuryNav />
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-8 lg:py-12">
        <header className="flex flex-col gap-4 border-b border-border-1 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="ds-kicker">Saved questions</p>
            <h1 className="font-display text-3xl font-medium tracking-tight text-ink-strong sm:text-4xl">
              Questions
            </h1>
            <p className="max-w-[55ch] text-sm leading-relaxed text-ink-muted">
              Author and maintain governed SQL questions with scalar parameter schemas for{" "}
              <span className="font-medium text-ink">
                {me.current_workspace.workspace_name}
              </span>
              .
            </p>
          </div>
          {roleCanAuthor ? (
            <Link href="/questions?new=1" className="dby-btn dby-btn--primary shrink-0">
              <DsIcon icon={Plus} className="dby-btn__icon" />
              New question
            </Link>
          ) : null}
        </header>

        {listLoadError ? (
          <p className="text-sm text-danger-ink" role="alert">
            {listLoadError}
          </p>
        ) : null}

        {editingId && questionLoadError ? (
          <div className="dby-alert dby-alert--danger" role="alert">
            <div className="dby-alert__body">
              <p className="text-sm">{questionLoadError}</p>
              <Link
                href="/questions"
                className="mt-3 inline-block text-sm font-medium text-accent hover:text-accent-hover"
              >
                Back to list
              </Link>
            </div>
          </div>
        ) : null}

        <section className="flex flex-col gap-4" aria-labelledby="questions-list-heading">
          <h2
            id="questions-list-heading"
            className="font-display text-xl font-medium tracking-tight text-ink-strong"
          >
            All <span className="text-ink-muted">({questions.length})</span>
          </h2>

          {questions.length === 0 ? (
            <EmptyState
              icon={<DsIcon icon={FileCode2} size="md" />}
              kicker="No questions yet"
              description={
                roleCanAuthor
                  ? "Create a governed SQL question to reuse across dashboards."
                  : "No saved questions are available in this workspace yet."
              }
              action={
                roleCanAuthor ? (
                  <Link href="/questions?new=1" className="dby-btn dby-btn--primary">
                    <DsIcon icon={Plus} className="dby-btn__icon" />
                    New question
                  </Link>
                ) : null
              }
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {questions.map((q) => (
                <QuestionRow
                  key={q.id}
                  workspaceId={workspaceId}
                  question={q}
                  collectionName={collectionNameById.get(q.collection_id) ?? null}
                  canEdit={q.permission === "edit"}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
