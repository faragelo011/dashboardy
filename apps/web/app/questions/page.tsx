import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminLuxuryNav } from "@/app/admin-luxury-nav";
import { getProtectedMe } from "@/app/(protected)/data";
import {
  getSavedQuestion,
  listCollections,
  listSavedQuestions,
} from "@/app/lib/questions-api";
import { createServerSupabase } from "@/app/lib/supabase-server";
import type { SavedQuestionInternalDetail } from "@dashboardy/types";

import { QuestionEditor } from "./question-editor";

type PageProps = {
  searchParams: Promise<{ id?: string; new?: string }>;
};

export default async function QuestionsPage({ searchParams }: PageProps) {
  const me = await getProtectedMe();
  const role = me.current_workspace.role;
  if (role === "external_client") {
    redirect("/");
  }

  const canEdit = role === "admin" || role === "analyst";
  const params = await searchParams;
  const editingId = params.id?.trim();
  const isNew = params.new === "1";

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
  let question: SavedQuestionInternalDetail | null = null;
  let loadError: string | null = null;

  try {
    const [collectionsResp, questionsResp] = await Promise.all([
      listCollections(token, workspaceId),
      listSavedQuestions(token, workspaceId),
    ]);
    collections = collectionsResp.collections;
    questions = questionsResp.questions;

    if (editingId) {
      const detail = await getSavedQuestion(token, workspaceId, editingId);
      if (detail.detail_level === "internal") {
        question = detail;
      }
    }
  } catch (err) {
    console.error("failed to load questions", { workspaceId, err });
    loadError = "Failed to load saved questions. Please refresh and try again.";
  }

  const showEditor = Boolean(isNew || editingId);

  return (
    <div className="min-h-screen bg-[#06080A] text-[#F0F2F5] font-sans selection:bg-[#D4AF37]/30 selection:text-[#D4AF37]">
      <AdminLuxuryNav />
      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-12 sm:px-8 lg:py-24 animate-fade-in">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-12 max-w-3xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#D4AF37]">
            Saved questions
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-white tracking-tight font-light leading-none">
            Questions
          </h1>
          <p className="text-sm text-[#A0AAB2] font-light leading-relaxed max-w-[60ch]">
            Author and maintain governed SQL questions with scalar parameter schemas.
          </p>
        </header>

        {loadError ? (
          <p className="text-sm text-[#EF4444]" role="alert">
            {loadError}
          </p>
        ) : null}

        {showEditor ? (
          <QuestionEditor
            workspaceId={workspaceId}
            collections={collections}
            question={isNew ? null : question}
            canEdit={canEdit}
          />
        ) : (
          <section className="flex flex-col gap-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-[#5C6A7A]">
                Active questions ({questions.length})
              </h2>
              {canEdit ? (
                <Link
                  href="/questions?new=1"
                  className="bg-[#D4AF37] text-black px-5 py-2 text-[10px] uppercase tracking-[0.15em] font-medium hover:bg-[#FBE398]"
                >
                  New question
                </Link>
              ) : null}
            </div>

            {questions.length === 0 ? (
              <p className="text-sm text-[#A0AAB2]">No saved questions yet.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {questions.map((q) => (
                  <li key={q.id} className="border border-white/10 p-5 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-serif text-white">{q.title}</h3>
                      <Link
                        href={`/questions?id=${encodeURIComponent(q.id)}`}
                        className="text-[10px] uppercase tracking-[0.15em] text-[#D4AF37] hover:text-[#FBE398]"
                      >
                        Open
                      </Link>
                    </div>
                    {q.description ? (
                      <p className="text-sm text-[#A0AAB2]">{q.description}</p>
                    ) : null}
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">
                      Permission: {q.permission}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
