"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";

import type { Collection, ParameterDefinition, SavedQuestionDetail } from "@dashboardy/types";

import {
  deleteQuestionAction,
  executeQuestionAction,
  saveQuestionAction,
  type ExecuteQuestionActionState,
  type QuestionActionState,
} from "./actions";
import { ParameterEditor } from "./parameter-editor";
import { ResultsTable } from "./results-table";

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
  detail: SavedQuestionDetail | null;
  isNew: boolean;
  canEdit: boolean;
};

function ErrorBanner({
  state,
  title,
}: {
  state:
    | QuestionActionState
    | ExecuteQuestionActionState
    | null
    | undefined;
  title?: string;
}) {
  if (!state || state.ok) {
    return null;
  }
  return (
    <div className="border-l-2 border-[#EF4444] bg-[#EF4444]/5 p-4 text-sm text-[#A0AAB2]" role="alert">
      <span className="block text-[10px] uppercase tracking-[0.2em] text-[#EF4444] mb-1">
        {title ?? state.errorCode?.replace(/_/g, " ") ?? "Error"}
      </span>
      {state.message}
    </div>
  );
}

function RuntimeParameterInputs({
  parameters,
  values,
  onChange,
}: {
  parameters: ParameterDefinition[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  if (parameters.length === 0) {
    return <p className="text-xs text-[#5C6A7A]">No runtime parameters required.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {parameters.map((param) => (
        <label key={param.name} className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">
            {param.label ?? param.name}
            {param.required ? " *" : ""}
          </span>
          {param.type === "boolean" ? (
            <select
              className={fieldClass}
              value={values[param.name] ?? ""}
              onChange={(e) =>
                onChange({ ...values, [param.name]: e.target.value })
              }
            >
              <option value="">Select…</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <input
              className={fieldClass}
              type={param.type === "number" ? "number" : param.type === "date" ? "date" : "text"}
              value={values[param.name] ?? ""}
              onChange={(e) =>
                onChange({ ...values, [param.name]: e.target.value })
              }
            />
          )}
        </label>
      ))}
    </div>
  );
}

function buildRuntimePayload(
  parameters: ParameterDefinition[],
  values: Record<string, string>,
): Record<string, string | number | boolean> {
  const payload: Record<string, string | number | boolean> = {};
  for (const param of parameters) {
    const raw = values[param.name];
    if (raw === undefined || raw === "") {
      continue;
    }
    if (param.type === "number") {
      payload[param.name] = raw.includes(".") ? Number.parseFloat(raw) : Number.parseInt(raw, 10);
      continue;
    }
    if (param.type === "boolean") {
      payload[param.name] = raw === "true";
      continue;
    }
    payload[param.name] = raw;
  }
  return payload;
}

export function QuestionEditor({ workspaceId, collections, detail, isNew, canEdit }: Props) {
  const router = useRouter();
  const editableCollections = useMemo(
    () => collections.filter((c) => c.permission === "edit"),
    [collections],
  );
  const [parameters, setParameters] = useState(detail?.parameters ?? []);
  const [runtimeValues, setRuntimeValues] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<QuestionActionState | null>(null);
  const [deleteState, setDeleteState] = useState<QuestionActionState | null>(null);
  const [executeState, setExecuteState] =
    useState<ExecuteQuestionActionState | null>(null);
  const [savePending, startSaveTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const [executePending, startExecuteTransition] = useTransition();

  const formKey = detail?.updated_at ?? (isNew ? "new" : "missing");
  const sqlText = detail?.detail_level === "internal" ? detail.sql_text : "";
  const schemaParameters = canEdit ? parameters : (detail?.parameters ?? []);
  const canRun = Boolean(detail && !isNew);

  useEffect(() => {
    setParameters(detail?.parameters ?? []);
    setRuntimeValues({});
    setSaveState(null);
    setDeleteState(null);
    setExecuteState(null);
  }, [detail]);

  const savedUpdatedAt =
    saveState?.ok === true ? saveState.updatedAt : undefined;

  useEffect(() => {
    if (!saveState?.ok) {
      return;
    }
    if (saveState.questionId && isNew) {
      router.push(`/questions?id=${encodeURIComponent(saveState.questionId)}`);
    }
    router.refresh();
  }, [saveState, isNew, router]);

  useEffect(() => {
    if (!deleteState?.ok) {
      return;
    }
    router.push("/questions");
    router.refresh();
  }, [deleteState, router]);

  const defaultCollectionId =
    detail?.collection_id ?? editableCollections[0]?.id ?? collections[0]?.id ?? "";

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

  const submitExecute = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (submitter instanceof HTMLButtonElement) {
      formData.set("bypass_cache", submitter.value);
    }
    startExecuteTransition(() => {
      void executeQuestionAction(null, formData).then(setExecuteState);
    });
  };

  return (
    <div className="flex flex-col gap-8 border border-white/10 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-serif text-white font-light">
          {isNew ? "New question" : canEdit ? "Edit question" : "View question"}
        </h2>
        <Link href="/questions" className={quietButtonClass}>
          Back to list
        </Link>
      </div>

      <form key={formKey} onSubmit={submitSave} className="flex flex-col gap-6">
        <input type="hidden" name="workspace_id" value={workspaceId} />
        {detail && !isNew ? (
          <>
            <input type="hidden" name="question_id" value={detail.id} />
            <input
              type="hidden"
              name="expected_updated_at"
              value={savedUpdatedAt ?? detail.updated_at}
            />
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
            defaultValue={detail?.title ?? ""}
            required
            disabled={!canEdit}
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">Description</span>
          <textarea
            name="description"
            defaultValue={detail?.description ?? ""}
            disabled={!canEdit}
            className={fieldClass}
            rows={2}
          />
        </label>

        {detail?.detail_level === "consumer" ? (
          <p className="text-sm text-[#A0AAB2]">
            SQL text is hidden for view-only access.
          </p>
        ) : (
          <label className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">SQL</span>
            <textarea
              name="sql_text"
              defaultValue={sqlText}
              required={canEdit}
              disabled={!canEdit}
              spellCheck={false}
              className={sqlClass}
            />
          </label>
        )}

        {canEdit ? (
          <ParameterEditor value={parameters} onChange={setParameters} disabled={false} />
        ) : null}

        <ErrorBanner state={saveState} />
        {canEdit ? (
          <button type="submit" disabled={savePending} className={primaryButtonClass}>
            {savePending ? "Saving..." : isNew ? "Create question" : "Update question"}
          </button>
        ) : null}
      </form>

      {canRun ? (
        <section className="flex flex-col gap-6 border-t border-white/10 pt-8">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">Run question</h3>
          <form onSubmit={submitExecute} className="flex flex-col gap-4">
            <input type="hidden" name="workspace_id" value={workspaceId} />
            <input type="hidden" name="question_id" value={detail?.id ?? ""} />
            <input
              type="hidden"
              name="runtime_parameters_json"
              value={JSON.stringify(
                buildRuntimePayload(schemaParameters, runtimeValues),
              )}
            />
            <RuntimeParameterInputs
              parameters={schemaParameters}
              values={runtimeValues}
              onChange={setRuntimeValues}
            />
            <ErrorBanner state={executeState} title="Execution failed" />
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                name="bypass_cache"
                value="false"
                disabled={executePending}
                className={primaryButtonClass}
              >
                {executePending ? "Running..." : "Execute"}
              </button>
              <button
                type="submit"
                name="bypass_cache"
                value="true"
                disabled={executePending}
                className={quietButtonClass}
              >
                {executePending ? "Running..." : "Force fresh"}
              </button>
            </div>
          </form>
          {executeState?.ok ? <ResultsTable result={executeState.result} /> : null}
        </section>
      ) : null}

      {detail && !isNew && canEdit ? (
        <form onSubmit={submitDelete}>
          <input type="hidden" name="workspace_id" value={workspaceId} />
          <input type="hidden" name="question_id" value={detail.id} />
          <ErrorBanner state={deleteState} />
          <button type="submit" disabled={deletePending} className={quietButtonClass}>
            {deletePending ? "Deleting..." : "Delete question"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
