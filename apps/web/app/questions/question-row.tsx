"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import type { SavedQuestionSummary } from "@dashboardy/types";

import { ConfirmDialog } from "@/components/ds/confirm-dialog";
import { DsIcon } from "@/components/ds/icon";
import { IconButton } from "@/components/ds/icon-button";

import { deleteQuestionAction } from "./actions";

type Props = {
  workspaceId: string;
  question: SavedQuestionSummary;
  collectionName?: string | null;
  canEdit: boolean;
};

export function QuestionRow({
  workspaceId,
  question,
  collectionName,
  canEdit,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    setError(null);
    const formData = new FormData();
    formData.set("workspace_id", workspaceId);
    formData.set("question_id", question.id);
    startTransition(async () => {
      const result = await deleteQuestionAction(formData);
      if (!result.ok) {
        setConfirmOpen(false);
        setError(result.message);
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    });
  };

  return (
    <li className="rounded-ds-md border border-border-1 bg-surface-0 transition-colors hover:border-border-2 hover:bg-surface-1">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <Link
            href={`/questions?id=${encodeURIComponent(question.id)}`}
            className="font-display text-lg font-medium tracking-tight text-ink-strong hover:text-accent"
          >
            {question.title}
          </Link>
          {question.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
              {question.description}
            </p>
          ) : null}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
            {collectionName ? (
              <span className="inline-flex items-center rounded-pill bg-surface-2 px-2.5 py-0.5 font-medium text-ink">
                {collectionName}
              </span>
            ) : null}
            <span className="capitalize">{question.permission}</span>
            <span aria-hidden="true">·</span>
            <span>Updated {new Date(question.updated_at).toLocaleDateString()}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <>
              <Link
                href={`/questions?id=${encodeURIComponent(question.id)}`}
                className="ds-btn ds-btn-secondary ds-btn--sm"
              >
                <DsIcon icon={Pencil} className="mr-1.5" />
                Edit
              </Link>
              <IconButton
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setConfirmOpen(true)}
                aria-label={`Delete ${question.title}`}
                title="Delete"
              >
                <DsIcon icon={Trash2} />
              </IconButton>
            </>
          ) : (
            <Link
              href={`/questions?id=${encodeURIComponent(question.id)}`}
              className="ds-btn ds-btn-secondary ds-btn--sm"
            >
              Open
            </Link>
          )}
        </div>
      </div>
      {error ? (
        <p className="border-t border-border-1 px-4 py-2 text-sm text-danger-ink" role="alert">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete question?"
        description={`“${question.title}” will be permanently removed. Dashboards that reference it may break.`}
        confirmLabel="Delete question"
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={remove}
      />
    </li>
  );
}
