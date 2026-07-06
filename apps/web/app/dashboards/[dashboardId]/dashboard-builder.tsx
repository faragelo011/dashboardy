"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type {
  Collection,
  DashboardEditorDetail,
  DashboardWidgetUpdateInput,
  SavedQuestionSummary,
} from "@dashboardy/types";

import { ApiError, updateDashboard } from "@/app/lib/dashboards-api";

import { DashboardGrid, type EditableWidget } from "./dashboard-grid";

type DashboardBuilderProps = {
  accessToken: string;
  workspaceId: string;
  initial: DashboardEditorDetail;
  collections: Collection[];
  questions: SavedQuestionSummary[];
};

export function DashboardBuilder({
  accessToken,
  workspaceId,
  initial,
  collections,
  questions,
}: DashboardBuilderProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [collectionId, setCollectionId] = useState(initial.collection_id);
  const [updatedAt, setUpdatedAt] = useState(initial.updated_at);
  const [widgets, setWidgets] = useState<EditableWidget[]>(initial.widgets);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        const payloadWidgets: DashboardWidgetUpdateInput[] = widgets.map((w) => ({
          id: "id" in w && w.id ? w.id : crypto.randomUUID(),
          title: w.title,
          widget_type: w.widget_type,
          saved_question_id: w.saved_question_id,
          layout: w.layout,
          config: w.config ?? {},
          filter_bindings: w.filter_bindings ?? {},
          filter_overrides: w.filter_overrides ?? {},
        }));
        const saved = await updateDashboard(accessToken, workspaceId, initial.id, {
          updated_at: updatedAt,
          title,
          collection_id: collectionId,
          definition: initial.definition,
          widgets: payloadWidgets,
        });
        setUpdatedAt(saved.updated_at);
        if (saved.detail_level === "editor") {
          setWidgets(saved.widgets);
        }
        router.refresh();
      } catch (err) {
        if (err instanceof ApiError && err.errorCode === "stale_update") {
          setError(
            "This dashboard was updated elsewhere. Reload the page and try again.",
          );
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to save dashboard.",
        );
      }
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border-1 pb-6">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="ds-label">Title</span>
            <input
              className="ds-input max-w-md"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="ds-label">Collection</span>
            <select
              className="ds-input max-w-md"
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboards" className="ds-btn ds-btn-secondary">
            Back to list
          </Link>
          <Link
            href={`/dashboards/${initial.id}`}
            className="ds-btn ds-btn-secondary"
          >
            View
          </Link>
          <button
            type="button"
            className="ds-btn ds-btn-primary"
            disabled={pending}
            onClick={save}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-danger-ink" role="alert">
          {error}
        </p>
      ) : null}

      <DashboardGrid
        accessToken={accessToken}
        workspaceId={workspaceId}
        dashboardId={initial.id}
        widgets={widgets}
        mode="edit"
        questions={questions}
        onWidgetsChange={setWidgets}
      />
    </div>
  );
}
