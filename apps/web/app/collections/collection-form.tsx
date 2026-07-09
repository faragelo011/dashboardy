"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState, useTransition, type FormEvent } from "react";

import type { Collection } from "@dashboardy/types";

import { Button } from "@/components/ds/button";
import { ConfirmDialog } from "@/components/ds/confirm-dialog";
import { DsIcon } from "@/components/ds/icon";
import { IconButton } from "@/components/ds/icon-button";

import {
  createCollectionAction,
  deleteCollectionAction,
  updateCollectionAction,
  type CollectionActionState,
} from "./actions";

function ErrorBanner({ state }: { state: CollectionActionState | null }) {
  if (!state || state.ok) {
    return null;
  }
  return (
    <div className="dby-alert dby-alert--danger" role="alert">
      <div className="dby-alert__body">
        <span className="dby-alert__title">
          {state.errorCode?.replace(/_/g, " ") ?? "Error"}
        </span>
        <span>{state.message}</span>
      </div>
    </div>
  );
}

type CreateProps = {
  workspaceId: string;
  canEdit: boolean;
  cancelHref?: string;
  defaultSortOrder?: number;
};

export function CollectionCreateForm({
  workspaceId,
  canEdit,
  cancelHref = "/collections",
  defaultSortOrder = 0,
}: CreateProps) {
  const router = useRouter();
  const [state, setState] = useState<CollectionActionState | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!state?.ok) {
      return;
    }
    router.push("/collections");
    router.refresh();
  }, [state, router]);

  if (!canEdit) {
    return null;
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      void createCollectionAction(null, formData).then(setState);
    });
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-ds-md border border-border-1 bg-surface-2 p-5"
      aria-labelledby="new-collection-heading"
    >
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2
            id="new-collection-heading"
            className="font-display text-lg font-medium tracking-tight text-ink-strong"
          >
            New collection
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Group related saved questions under one name.
          </p>
        </div>
        <Link
          href={cancelHref}
          className="dby-iconbtn dby-iconbtn--ghost"
          aria-label="Cancel creating collection"
        >
          <DsIcon icon={X} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end">
        <label className="flex flex-col gap-1.5">
          <span className="ds-label">Name</span>
          <input
            name="name"
            required
            className="ds-input"
            placeholder="Revenue"
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="ds-label">Sort order</span>
          <input
            name="sort_order"
            type="number"
            defaultValue={defaultSortOrder}
            className="ds-input"
          />
        </label>
        <Button
          type="submit"
          variant="primary"
          disabled={pending}
          leftIcon={<DsIcon icon={Plus} />}
          className="w-full sm:w-auto"
        >
          {pending ? "Creating…" : "Create collection"}
        </Button>
      </div>
      <div className="mt-3">
        <ErrorBanner state={state} />
      </div>
    </form>
  );
}

type RowProps = {
  collection: Collection;
  workspaceId: string;
  canEdit: boolean;
  editing?: boolean;
};

export function CollectionRow({
  collection,
  workspaceId,
  canEdit,
  editing = false,
}: RowProps) {
  const router = useRouter();
  const [updateState, setUpdateState] = useState<CollectionActionState | null>(null);
  const [deleteState, setDeleteState] = useState<CollectionActionState | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [updatePending, startUpdateTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (!updateState?.ok && !deleteState?.ok) {
      return;
    }
    setConfirmOpen(false);
    router.push("/collections");
    router.refresh();
  }, [updateState, deleteState, router]);

  const submitUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startUpdateTransition(() => {
      void updateCollectionAction(null, formData).then(setUpdateState);
    });
  };

  const performDelete = () => {
    const formData = new FormData();
    formData.set("workspace_id", workspaceId);
    formData.set("collection_id", collection.id);
    startDeleteTransition(() => {
      void deleteCollectionAction(formData).then(setDeleteState);
    });
  };

  if (canEdit && editing) {
    return (
      <li className="rounded-ds-md border border-border-1 bg-surface-2 p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-medium tracking-tight text-ink-strong">
            Edit collection
          </h3>
          <Link
            href="/collections"
            className="dby-iconbtn dby-iconbtn--ghost"
            aria-label="Cancel editing"
          >
            <DsIcon icon={X} />
          </Link>
        </div>

        <form onSubmit={submitUpdate} className="flex flex-col gap-4">
          <input type="hidden" name="workspace_id" value={workspaceId} />
          <input type="hidden" name="collection_id" value={collection.id} />
          <input type="hidden" name="expected_updated_at" value={collection.updated_at} />
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-end">
            <label className="flex flex-col gap-1.5">
              <span className="ds-label">Name</span>
              <input
                name="name"
                defaultValue={collection.name}
                required
                className="ds-input"
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="ds-label">Sort order</span>
              <input
                name="sort_order"
                type="number"
                defaultValue={collection.sort_order}
                className="ds-input"
              />
            </label>
          </div>
          <ErrorBanner state={updateState} />
          <div className="flex flex-wrap justify-end gap-2">
            <Link href="/collections" className="dby-btn dby-btn--ghost">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={updatePending}
              className="ds-btn ds-btn-primary"
            >
              {updatePending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>

        <div className="mt-4 border-t border-border-1 pt-4">
          <ErrorBanner state={deleteState} />
          <button
            type="button"
            disabled={deletePending}
            onClick={() => setConfirmOpen(true)}
            className="ds-btn ds-btn-ghost ds-btn--sm text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
          >
            {deletePending ? "Deleting…" : "Delete collection"}
          </button>
        </div>
        <ConfirmDialog
          open={confirmOpen}
          title="Delete collection?"
          description={`“${collection.name}” will be permanently removed. It must be empty.`}
          confirmLabel="Delete collection"
          pending={deletePending}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={performDelete}
        />
      </li>
    );
  }

  return (
    <li className="rounded-ds-md border border-border-1 bg-surface-0 transition-colors hover:border-border-2 hover:bg-surface-1">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <DsIcon icon={FolderOpen} className="shrink-0 text-ink-muted" />
            <h3 className="font-display text-lg font-medium tracking-tight text-ink-strong truncate">
              {collection.name}
            </h3>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
            <span className="inline-flex items-center rounded-pill bg-surface-2 px-2.5 py-0.5 font-medium capitalize text-ink">
              {collection.permission}
            </span>
            <span>Sort {collection.sort_order}</span>
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/collections?edit=${encodeURIComponent(collection.id)}`}
              className="ds-btn ds-btn-secondary ds-btn--sm"
            >
              <DsIcon icon={Pencil} className="mr-1.5" />
              Edit
            </Link>
            <IconButton
              type="button"
              variant="ghost"
              disabled={deletePending}
              onClick={() => setConfirmOpen(true)}
              aria-label={`Delete ${collection.name}`}
              title="Delete"
            >
              <DsIcon icon={Trash2} />
            </IconButton>
          </div>
        ) : null}
      </div>
      {deleteState && !deleteState.ok ? (
        <div className="border-t border-border-1 px-4 py-2">
          <ErrorBanner state={deleteState} />
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete collection?"
        description={`“${collection.name}” will be permanently removed. It must be empty.`}
        confirmLabel="Delete collection"
        pending={deletePending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={performDelete}
      />
    </li>
  );
}
