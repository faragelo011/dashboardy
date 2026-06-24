"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";

import type { Collection, SavedQuestionInternalDetail } from "@dashboardy/types";

import { deleteQuestionAction, saveQuestionAction, type QuestionActionState } from "./actions";
import { ParameterEditor } from "./parameter-editor";

const fieldClass =
  "w-full bg-[#0B0F15] border border-white/10 px-4 py-3 text-[#F0F2F5] text-[13px] focus:outline-none focus:border-[#D4AF37]/50 rounded-sm";

const sqlClass =
  "w-full min-h-[200px] bg-[#0B0F15] border border-white/10 px-4 py-3 text-[#F0F2F5] text-[13px] font-mono focus:outline-none focus:border-[#D4AF37]/50 rounded-sm";

const primaryButtonClass =
  "bg-[#D4AF37] text-black px-6 py-3 text-[11px] uppercase tracking-[0.15em] font-medium hover:bg-[#FBE398] transition-colors disabled:opacity-50";

const quietButtonClass =
  "text-[#A0AAB2] hover:text-[#D4AF37] transition-colors text-[10px] uppercase tracking-[0.15em] border border-white/10 px-4 py-3";

type Props = {
  workspaceId: string;
  collections: Collection[];
  question: SavedQuestionInternalDetail | null;
  canEdit: boolean;
};

function ErrorBanner({ state }: { state: QuestionActionState | null }) {
  if (!state || state.ok) {
    return null;
  }
  return (
    <div className="border-l-2 border-[#EF4444] bg-[#EF4444]/5 p-4 text-sm text-[#A0AAB2]" role="alert">
      <span className="block text-[10px] uppercase tracking-[0.2em] text-[#EF4444] mb-1">
        {state.errorCode?.replace(/_/g, " ") ?? "Error"}
      </span>
      {state.message}
    </div>
  );
}

export function QuestionEditor({ workspaceId, collections, question, canEdit }: Props) {
  const editableCollections = useMemo(
    () => collections.filter((c) => c.permission === "edit"),
    [collections],
  );
  const [parameters, setParameters] = useState(question?.parameters ?? []);
  const [saveState, setSaveState] = useState<QuestionActionState | null>(null);
  const [deleteState, setDeleteState] = useState<QuestionActionState | null>(null);
  const [savePending, startSaveTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  useEffect(() => {
    setParameters(question?.parameters ?? []);
  }, [question]);

  const defaultCollectionId =
    question?.collection_id ?? editableCollections[0]?.id ?? collections[0]?.id ?? "";

  const submitSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startSaveTransition(() => {
      void saveQuestionAction(null, formData).then(setSaveState);
    });
  };

  const submitDelete = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startDeleteTransition(() => {
      void deleteQuestionAction(formData).then(setDeleteState);
    });
  };

  return (
    <div className="flex flex-col gap-8 border border-white/10 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-serif text-white font-light">
          {question ? "Edit question" : "New question"}
        </h2>
        <Link href="/questions" className={quietButtonClass}>
          Back to list
        </Link>
      </div>

      <form onSubmit={submitSave} className="flex flex-col gap-6">
        <input type="hidden" name="workspace_id" value={workspaceId} />
        {question ? (
          <>
            <input type="hidden" name="question_id" value={question.id} />
            <input type="hidden" name="expected_updated_at" value={question.updated_at} />
          </>
        ) : null}
        <input type="hidden" name="parameters_json" value={JSON.stringify(parameters)} />

        <label className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">Collection</span>
          <select
            name="collection_id"
            defaultValue={defaultCollectionId}
            disabled={!canEdit}
            className={fieldClass}
            required
          >
            {(canEdit ? editableCollections : collections).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">Title</span>
          <input
            name="title"
            defaultValue={question?.title ?? ""}
            required
            disabled={!canEdit}
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">Description</span>
          <textarea
            name="description"
            defaultValue={question?.description ?? ""}
            disabled={!canEdit}
            className={fieldClass}
            rows={2}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">SQL</span>
          <textarea
            name="sql_text"
            defaultValue={question?.sql_text ?? ""}
            required
            disabled={!canEdit}
            spellCheck={false}
            className={sqlClass}
          />
        </label>

        <ParameterEditor value={parameters} onChange={setParameters} disabled={!canEdit} />

        <ErrorBanner state={saveState} />
        {canEdit ? (
          <button type="submit" disabled={savePending} className={primaryButtonClass}>
            {savePending ? "Saving..." : question ? "Update question" : "Create question"}
          </button>
        ) : null}
      </form>

      {question && canEdit ? (
        <form onSubmit={submitDelete}>
          <input type="hidden" name="workspace_id" value={workspaceId} />
          <input type="hidden" name="question_id" value={question.id} />
          <ErrorBanner state={deleteState} />
          <button type="submit" disabled={deletePending} className={quietButtonClass}>
            {deletePending ? "Deleting..." : "Delete question"}
          </button>
        </form>
      ) : null}

      {saveState?.ok && saveState.questionId ? (
        <p className="text-xs text-[#D4AF37]">Saved. Refresh or continue editing.</p>
      ) : null}
    </div>
  );
}
