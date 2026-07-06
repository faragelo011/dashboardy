"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useEffect, useState, useTransition, type FormEvent } from "react";

import type { Collection } from "@dashboardy/types";

import { Button } from "@/components/ds/button";
import { DsIcon } from "@/components/ds/icon";

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
    <div className="ds-alert ds-alert--danger" role="alert">
      <div className="flex flex-col gap-1">
        <span className="font-semibold">{state.errorCode?.replace(/_/g, " ") ?? "Error"}</span>
        <span>{state.message}</span>
      </div>
    </div>
  );
}

type CreateProps = {
  workspaceId: string;
  canEdit: boolean;
};

export function CollectionCreateForm({ workspaceId, canEdit }: CreateProps) {
  const router = useRouter();
  const [state, setState] = useState<CollectionActionState | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!state?.ok) {
      return;
    }
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
    <form onSubmit={submit} className="ds-card flex flex-col gap-4 p-5">
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <h2 className="text-sm font-semibold text-ink-strong">New collection</h2>
      <label className="flex flex-col gap-1.5">
        <span className="ds-label">Name</span>
        <input name="name" required className="ds-input" placeholder="Revenue" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="ds-label">Sort order</span>
        <input name="sort_order" type="number" defaultValue={0} className="ds-input" />
      </label>
      <ErrorBanner state={state} />
      <Button type="submit" variant="primary" disabled={pending} leftIcon={<DsIcon icon={Plus} />}>
        {pending ? "Creating…" : "Create collection"}
      </Button>
    </form>
  );
}

type RowProps = {
  collection: Collection;
  workspaceId: string;
  canEdit: boolean;
};

export function CollectionRow({ collection, workspaceId, canEdit }: RowProps) {
  const router = useRouter();
  const [updateState, setUpdateState] = useState<CollectionActionState | null>(null);
  const [deleteState, setDeleteState] = useState<CollectionActionState | null>(null);
  const [updatePending, startUpdateTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (!updateState?.ok && !deleteState?.ok) {
      return;
    }
    router.refresh();
  }, [updateState, deleteState, router]);

  const submitUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startUpdateTransition(() => {
      void updateCollectionAction(null, formData).then(setUpdateState);
    });
  };

  const submitDelete = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startDeleteTransition(() => {
      void deleteCollectionAction(formData).then(setDeleteState);
    });
  };

  return (
    <li className="ds-card flex flex-col gap-4 p-5">
      {canEdit ? (
        <form onSubmit={submitUpdate} className="flex flex-col gap-4">
          <input type="hidden" name="workspace_id" value={workspaceId} />
          <input type="hidden" name="collection_id" value={collection.id} />
          <input type="hidden" name="expected_updated_at" value={collection.updated_at} />
          <label className="flex flex-col gap-1.5">
            <span className="ds-label">Name</span>
            <input name="name" defaultValue={collection.name} required className="ds-input" />
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
          <ErrorBanner state={updateState} />
          <button type="submit" disabled={updatePending} className="ds-btn ds-btn-primary">
            {updatePending ? "Saving…" : "Save changes"}
          </button>
        </form>
      ) : (
        <div>
          <h3 className="text-base font-semibold text-ink-strong">{collection.name}</h3>
          <p className="ds-help mt-0.5">Sort order {collection.sort_order}</p>
        </div>
      )}

      {canEdit ? (
        <form onSubmit={submitDelete}>
          <input type="hidden" name="workspace_id" value={workspaceId} />
          <input type="hidden" name="collection_id" value={collection.id} />
          <ErrorBanner state={deleteState} />
          <button type="submit" disabled={deletePending} className="ds-btn ds-btn-ghost text-danger-ink hover:text-danger-ink hover:bg-danger-soft text-xs">
            {deletePending ? "Deleting…" : "Delete collection"}
          </button>
        </form>
      ) : null}
    </li>
  );
}
