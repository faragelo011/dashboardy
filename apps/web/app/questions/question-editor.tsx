"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Download,
  Play,
  Save,
  Trash2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";

import type { Collection, ParameterDefinition, SavedQuestionDetail } from "@dashboardy/types";

import { ConfirmDialog } from "@/components/ds/confirm-dialog";
import { DsIcon } from "@/components/ds/icon";

import {
  cloneQuestionAction,
  deleteQuestionAction,
  executeQuestionAction,
  exportQuestionAction,
  saveQuestionAction,
  type ExecuteQuestionActionState,
  type ExportQuestionActionState,
  type QuestionActionState,
} from "./actions";
import { ParameterEditor } from "./parameter-editor";
import { ResultsTable } from "./results-table";

const fieldClass = "dby-input";
const sqlClass = "dby-textarea dby-textarea--mono min-h-[220px] font-mono";
const labelClass = "ds-label";

const iconInButton = (icon: LucideIcon) => (
  <DsIcon icon={icon} className="inline-block shrink-0" />
);

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
    | ExportQuestionActionState
    | null
    | undefined;
  title?: string;
}) {
  if (!state || state.ok) {
    return null;
  }
  return (
    <div className="dby-alert dby-alert--danger" role="alert">
      <div className="dby-alert__body">
        <span className="dby-alert__title">
          {title ?? state.errorCode?.replace(/_/g, " ") ?? "Error"}
        </span>
        <span>{state.message}</span>
      </div>
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
    return (
      <p className="text-sm text-ink-muted">No runtime parameters required.</p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {parameters.map((param) => (
        <label key={param.name} className="flex flex-col gap-1.5">
          <span className={labelClass}>
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
              type={
                param.type === "number"
                  ? "number"
                  : param.type === "date"
                    ? "date"
                    : "text"
              }
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
      payload[param.name] = Number(raw);
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

export function QuestionEditor({
  workspaceId,
  collections,
  detail,
  isNew,
  canEdit,
}: Props) {
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
  const [cloneState, setCloneState] = useState<QuestionActionState | null>(null);
  const [exportState, setExportState] = useState<ExportQuestionActionState | null>(null);
  const [showClone, setShowClone] = useState(false);
  const [clonePending, setClonePending] = useState(false);
  const [exportPending, setExportPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savePending, startSaveTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const [executePending, startExecuteTransition] = useTransition();

  const collectionsRevision = useMemo(
    () => collections.map((c) => `${c.id}:${c.updated_at}:${c.name}`).join("|"),
    [collections],
  );
  const formKey = `${detail?.updated_at ?? (isNew ? "new" : "missing")}|${collectionsRevision}`;
  const sqlText = detail?.detail_level === "internal" ? detail.sql_text : "";
  const schemaParameters = canEdit ? parameters : (detail?.parameters ?? []);
  const canRun = Boolean(detail && !isNew);
  const canClone = canEdit && canRun && editableCollections.length > 0;
  const canExport = canRun && Boolean(detail?.can_export);

  useEffect(() => {
    setParameters(detail?.parameters ?? []);
    setRuntimeValues({});
    setSaveState(null);
    setDeleteState(null);
    setExecuteState(null);
    setCloneState(null);
    setExportState(null);
    setShowClone(false);
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
    setConfirmOpen(false);
    router.push("/questions");
    router.refresh();
  }, [deleteState, router]);

  useEffect(() => {
    if (!cloneState?.ok || !cloneState.questionId) {
      return;
    }
    router.push(`/questions?id=${encodeURIComponent(cloneState.questionId)}`);
    router.refresh();
  }, [cloneState, router]);

  const defaultCollectionId =
    detail?.collection_id ?? editableCollections[0]?.id ?? collections[0]?.id ?? "";

  const submitSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startSaveTransition(() => {
      void saveQuestionAction(null, formData).then(setSaveState);
    });
  };

  const performDelete = () => {
    if (!detail) {
      return;
    }
    const formData = new FormData();
    formData.set("workspace_id", workspaceId);
    formData.set("question_id", detail.id);
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

  const submitClone = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setClonePending(true);
    void cloneQuestionAction(formData)
      .then(setCloneState)
      .finally(() => setClonePending(false));
  };

  const submitExport = () => {
    if (!detail) {
      return;
    }
    const formData = new FormData();
    formData.set("workspace_id", workspaceId);
    formData.set("question_id", detail.id);
    formData.set(
      "runtime_parameters_json",
      JSON.stringify(buildRuntimePayload(schemaParameters, runtimeValues)),
    );
    setExportPending(true);
    void exportQuestionAction(formData)
      .then(async (state) => {
        setExportState(state);
        if (!state.ok) {
          return;
        }
        try {
          const response = await fetch(state.downloadUrl);
          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as
              | { message?: string; error_code?: string }
              | null;
            setExportState({
              ok: false,
              message: body?.message ?? "Failed to export saved question.",
              errorCode: body?.error_code,
            });
            return;
          }
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = `${state.questionId}.csv`;
          anchor.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
        } catch (err) {
          setExportState({
            ok: false,
            message:
              err instanceof Error
                ? err.message
                : "Failed to export saved question.",
          });
        }
      })
      .finally(() => setExportPending(false));
  };

  const heading = isNew
    ? "New question"
    : canEdit
      ? "Edit question"
      : "View question";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 border-b border-border-1 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/questions"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent"
          >
            <DsIcon icon={ArrowLeft} />
            Questions
          </Link>
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink-strong">
            {heading}
          </h1>
          {!isNew && detail ? (
            <p className="text-sm text-ink-muted">
              Updated {new Date(detail.updated_at).toLocaleString()}
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              <span className="capitalize">{detail.permission}</span>
            </p>
          ) : (
            <p className="text-sm text-ink-muted">
              Define SQL, parameters, then save to run and share.
            </p>
          )}
        </div>
      </div>

      <form
        key={formKey}
        id="question-definition-form"
        onSubmit={submitSave}
        className="flex flex-col gap-5 rounded-ds-md border border-border-1 bg-surface-0 p-5"
      >
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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Collection</span>
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
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Title</span>
            <input
              name="title"
              defaultValue={detail?.title ?? ""}
              required
              disabled={!canEdit}
              className={fieldClass}
              placeholder="Revenue by day"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Description</span>
          <textarea
            name="description"
            defaultValue={detail?.description ?? ""}
            disabled={!canEdit}
            className={fieldClass}
            rows={2}
            placeholder="Optional context for consumers"
          />
        </label>

        {detail?.detail_level === "consumer" ? (
          <p className="rounded-ds-md border border-dashed border-border-2 bg-surface-1 px-4 py-3 text-sm text-ink-muted">
            SQL text is hidden for view-only access.
          </p>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>SQL</span>
            <textarea
              name="sql_text"
              defaultValue={sqlText}
              required={canEdit}
              disabled={!canEdit}
              spellCheck={false}
              className={sqlClass}
              placeholder="SELECT …"
            />
          </label>
        )}

        {canEdit ? (
          <div className="rounded-ds-md border border-border-1 bg-surface-1 p-4">
            <ParameterEditor value={parameters} onChange={setParameters} disabled={false} />
          </div>
        ) : schemaParameters.length > 0 ? (
          <div className="rounded-ds-md border border-border-1 bg-surface-1 p-4">
            <p className="ds-kicker mb-3">Parameters</p>
            <ul className="flex flex-col gap-1 text-sm text-ink-muted">
              {schemaParameters.map((p) => (
                <li key={p.name}>
                  <span className="font-medium text-ink">{p.label ?? p.name}</span>
                  <span className="text-ink-faint"> · {p.type}</span>
                  {p.required ? <span className="text-ink-faint"> · required</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <ErrorBanner state={saveState} />

        {canEdit ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-1 pt-4">
            <Link href="/questions" className="dby-btn dby-btn--ghost">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={savePending}
              className="dby-btn dby-btn--primary"
            >
              {iconInButton(Save)}
              {savePending
                ? "Saving…"
                : isNew
                  ? "Create question"
                  : "Save changes"}
            </button>
          </div>
        ) : null}
      </form>

      {canRun ? (
        <section
          className="flex flex-col gap-4 rounded-ds-md border border-border-1 bg-surface-0 p-5"
          aria-labelledby="run-question-heading"
        >
          <div>
            <h2
              id="run-question-heading"
              className="font-display text-lg font-medium tracking-tight text-ink-strong"
            >
              Run
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Execute against the warehouse with optional parameter values.
            </p>
          </div>

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
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                name="bypass_cache"
                value="false"
                disabled={executePending}
                className="dby-btn dby-btn--primary"
              >
                {iconInButton(Play)}
                {executePending ? "Running…" : "Execute"}
              </button>
              <button
                type="submit"
                name="bypass_cache"
                value="true"
                disabled={executePending}
                className="dby-btn dby-btn--secondary"
              >
                {iconInButton(Zap)}
                {executePending ? "Running…" : "Force fresh"}
              </button>
              {canExport ? (
                <button
                  type="button"
                  onClick={submitExport}
                  disabled={exportPending}
                  className="dby-btn dby-btn--ghost"
                >
                  {iconInButton(Download)}
                  {exportPending ? "Exporting…" : "Export CSV"}
                </button>
              ) : null}
            </div>
            <ErrorBanner state={exportState} title="Export failed" />
          </form>

          {executeState?.ok ? <ResultsTable result={executeState.result} /> : null}
        </section>
      ) : null}

      {canClone ? (
        <section className="flex flex-col gap-3" aria-labelledby="clone-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="clone-heading"
                className="font-display text-lg font-medium tracking-tight text-ink-strong"
              >
                Clone
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Copy this question into another editable collection.
              </p>
            </div>
            {!showClone ? (
              <button
                type="button"
                className="dby-btn dby-btn--secondary"
                onClick={() => setShowClone(true)}
              >
                {iconInButton(Copy)}
                Clone question
              </button>
            ) : null}
          </div>

          {showClone ? (
            <form
              key={`clone-${collectionsRevision}`}
              onSubmit={submitClone}
              className="rounded-ds-md border border-border-1 bg-surface-2 p-5"
            >
              <input type="hidden" name="workspace_id" value={workspaceId} />
              <input type="hidden" name="question_id" value={detail?.id ?? ""} />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Target collection</span>
                  <select
                    name="target_collection_id"
                    defaultValue={editableCollections[0]?.id ?? ""}
                    className={fieldClass}
                    required
                  >
                    {editableCollections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Title override (optional)</span>
                  <input
                    name="clone_title"
                    placeholder={detail?.title ?? ""}
                    className={fieldClass}
                  />
                </label>
              </div>
              <ErrorBanner state={cloneState} title="Clone failed" />
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="dby-btn dby-btn--ghost"
                  onClick={() => setShowClone(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={clonePending}
                  className="dby-btn dby-btn--primary"
                >
                  {iconInButton(Copy)}
                  {clonePending ? "Cloning…" : "Create clone"}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      {detail && !isNew && canEdit ? (
        <section className="border-t border-border-1 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink-strong">Delete question</p>
              <p className="text-xs text-ink-muted">
                Permanently remove this question. Dashboards that reference it may break.
              </p>
            </div>
            <button
              type="button"
              disabled={deletePending}
              onClick={() => setConfirmOpen(true)}
              className="dby-btn dby-btn--ghost text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
            >
              {iconInButton(Trash2)}
              {deletePending ? "Deleting…" : "Delete"}
            </button>
          </div>
          <div className="mt-3">
            <ErrorBanner state={deleteState} />
          </div>
          <ConfirmDialog
            open={confirmOpen}
            title="Delete question?"
            description={`“${detail.title}” will be permanently removed. Dashboards that reference it may break.`}
            confirmLabel="Delete question"
            pending={deletePending}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={performDelete}
          />
        </section>
      ) : null}
    </div>
  );
}
