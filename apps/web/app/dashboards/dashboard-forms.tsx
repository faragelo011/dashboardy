"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";

import type { Collection, DashboardSummary } from "@dashboardy/types";

import { ApiError, createDashboard, deleteDashboard } from "@/app/lib/dashboards-api";
import { Button } from "@/components/ds/button";
import { ConfirmDialog } from "@/components/ds/confirm-dialog";
import { DsIcon } from "@/components/ds/icon";
import { IconButton } from "@/components/ds/icon-button";

type CreateProps = {
  accessToken: string;
  workspaceId: string;
  collections: Collection[];
  canEdit: boolean;
  cancelHref?: string;
};

export function DashboardCreateForm({
  accessToken,
  workspaceId,
  collections,
  canEdit,
  cancelHref = "/dashboards",
}: CreateProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canEdit || collections.length === 0) {
    return null;
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const collectionId = String(form.get("collection_id") ?? "");
    const title = String(form.get("title") ?? "").trim();
    if (!title || !collectionId) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const created = await createDashboard(accessToken, workspaceId, {
          collection_id: collectionId,
          title,
        });
        router.push(`/dashboards/${created.id}/edit`);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to create dashboard.",
        );
      }
    });
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-ds-md border border-border-1 bg-surface-2 p-5"
      aria-labelledby="new-dashboard-heading"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2
            id="new-dashboard-heading"
            className="font-display text-lg font-medium tracking-tight text-ink-strong"
          >
            New dashboard
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Pick a collection and title, then continue in the builder.
          </p>
        </div>
        <Link
          href={cancelHref}
          className="dby-iconbtn dby-iconbtn--ghost"
          aria-label="Cancel creating dashboard"
        >
          <DsIcon icon={X} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] sm:items-end">
        <label className="flex flex-col gap-1.5">
          <span className="ds-label">Collection</span>
          <select name="collection_id" required className="ds-input">
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="ds-label">Title</span>
          <input
            name="title"
            required
            className="ds-input"
            placeholder="Revenue Overview"
            autoFocus
          />
        </label>
        <Button
          type="submit"
          variant="primary"
          disabled={pending}
          leftIcon={<DsIcon icon={Plus} />}
          className="w-full sm:w-auto"
        >
          {pending ? "Creating…" : "Create dashboard"}
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-danger-ink" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

type FilterProps = {
  collections: Collection[];
  currentCollectionId?: string;
};

export function DashboardCollectionFilter({
  collections,
  currentCollectionId,
}: FilterProps) {
  return (
    <form method="get" className="flex items-center gap-2">
      <label className="sr-only" htmlFor="dashboard-collection-filter">
        Filter by collection
      </label>
      <select
        id="dashboard-collection-filter"
        name="collection_id"
        defaultValue={currentCollectionId ?? ""}
        className="ds-input min-w-[11rem]"
        onChange={(event) => {
          event.currentTarget.form?.requestSubmit();
        }}
      >
        <option value="">All collections</option>
        {collections.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="ds-btn ds-btn-secondary ds-btn--sm">
          Apply
        </button>
      </noscript>
    </form>
  );
}

type RowProps = {
  accessToken: string;
  workspaceId: string;
  dashboard: DashboardSummary;
  canEdit: boolean;
  collectionName?: string | null;
};

export function DashboardRow({
  accessToken,
  workspaceId,
  dashboard,
  canEdit,
  collectionName,
}: RowProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    setError(null);
    startTransition(async () => {
      try {
        await deleteDashboard(accessToken, workspaceId, dashboard.id);
        setConfirmOpen(false);
        router.refresh();
      } catch (err) {
        setConfirmOpen(false);
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to delete dashboard.",
        );
      }
    });
  };

  return (
    <li className="group rounded-ds-md border border-border-1 bg-surface-0 transition-colors hover:border-border-2 hover:bg-surface-1">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboards/${dashboard.id}`}
            className="font-display text-lg font-medium tracking-tight text-ink-strong hover:text-accent"
          >
            {dashboard.title}
          </Link>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
            {collectionName ? (
              <span className="inline-flex items-center rounded-pill bg-surface-2 px-2.5 py-0.5 font-medium text-ink">
                {collectionName}
              </span>
            ) : null}
            <span>Updated {new Date(dashboard.updated_at).toLocaleString()}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboards/${dashboard.id}`}
            className="ds-btn ds-btn-secondary ds-btn--sm"
          >
            Open
          </Link>
          {canEdit ? (
            <>
              <Link
                href={`/dashboards/${dashboard.id}/edit`}
                className="ds-btn ds-btn-ghost ds-btn--sm"
                aria-label={`Edit ${dashboard.title}`}
              >
                <DsIcon icon={Pencil} className="mr-1.5" />
                Edit
              </Link>
              <IconButton
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setConfirmOpen(true)}
                aria-label={`Delete ${dashboard.title}`}
                title="Delete"
              >
                <DsIcon icon={Trash2} />
              </IconButton>
            </>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className="border-t border-border-1 px-4 py-2 text-sm text-danger-ink" role="alert">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete dashboard?"
        description={`“${dashboard.title}” will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete dashboard"
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={remove}
      />
    </li>
  );
}
