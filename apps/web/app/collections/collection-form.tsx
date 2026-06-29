"use client";

import { useState, useTransition, type FormEvent } from "react";

import type { Collection } from "@dashboardy/types";

import {
  createCollectionAction,
  deleteCollectionAction,
  updateCollectionAction,
  type CollectionActionState,
} from "./actions";

const fieldClass =
  "w-full bg-transparent border-b border-white/20 px-0 py-2 text-[#F8FAFC] text-sm focus:outline-none focus:border-[#6366F1] focus:ring-0 transition-colors rounded-none placeholder:text-[#374151]";

const primaryButtonClass =
  "bg-[#6366F1] text-black px-6 py-3 text-[11px] uppercase tracking-[0.15em] font-medium hover:bg-[#818CF8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const quietButtonClass =
  "text-[#94A3B8] hover:text-[#6366F1] transition-colors text-[10px] uppercase tracking-[0.15em] bg-transparent border border-white/10 px-4 py-3 hover:border-[#6366F1]/50 disabled:opacity-50";

function ErrorBanner({ state }: { state: CollectionActionState | null }) {
  if (!state || state.ok) {
    return null;
  }
  return (
    <div className="border-l-2 border-[#EF4444] bg-[#EF4444]/5 p-4 text-sm text-[#94A3B8]" role="alert">
      <span className="block text-[10px] uppercase tracking-[0.2em] text-[#EF4444] mb-1">
        {state.errorCode?.replace(/_/g, " ") ?? "Error"}
      </span>
      {state.message}
    </div>
  );
}

type CreateProps = {
  workspaceId: string;
  canEdit: boolean;
};

export function CollectionCreateForm({ workspaceId, canEdit }: CreateProps) {
  const [state, setState] = useState<CollectionActionState | null>(null);
  const [pending, startTransition] = useTransition();
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
    <form onSubmit={submit} className="flex flex-col gap-4 border border-white/10 p-6">
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <label className="flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-[0.15em] text-[#374151]">New collection</span>
        <input name="name" required className={fieldClass} placeholder="Revenue" />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-[0.15em] text-[#374151]">Sort order</span>
        <input name="sort_order" type="number" defaultValue={0} className={fieldClass} />
      </label>
      <ErrorBanner state={state} />
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Creating..." : "Create collection"}
      </button>
    </form>
  );
}

type RowProps = {
  collection: Collection;
  workspaceId: string;
  canEdit: boolean;
};

export function CollectionRow({ collection, workspaceId, canEdit }: RowProps) {
  const [updateState, setUpdateState] = useState<CollectionActionState | null>(null);
  const [deleteState, setDeleteState] = useState<CollectionActionState | null>(null);
  const [updatePending, startUpdateTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

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
    <li className="border border-white/10 p-6 flex flex-col gap-4">
      {canEdit ? (
        <form onSubmit={submitUpdate} className="flex flex-col gap-4">
          <input type="hidden" name="workspace_id" value={workspaceId} />
          <input type="hidden" name="collection_id" value={collection.id} />
          <input type="hidden" name="expected_updated_at" value={collection.updated_at} />
          <label className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#374151]">Name</span>
            <input name="name" defaultValue={collection.name} required className={fieldClass} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#374151]">Sort order</span>
            <input
              name="sort_order"
              type="number"
              defaultValue={collection.sort_order}
              className={fieldClass}
            />
          </label>
          <ErrorBanner state={updateState} />
          <button type="submit" disabled={updatePending} className={primaryButtonClass}>
            {updatePending ? "Saving..." : "Save changes"}
          </button>
        </form>
      ) : (
        <div>
          <h3 className="text-lg font-serif text-white">{collection.name}</h3>
          <p className="text-xs text-[#374151] mt-1">Sort order {collection.sort_order}</p>
        </div>
      )}

      {canEdit ? (
        <form onSubmit={submitDelete}>
          <input type="hidden" name="workspace_id" value={workspaceId} />
          <input type="hidden" name="collection_id" value={collection.id} />
          <ErrorBanner state={deleteState} />
          <button type="submit" disabled={deletePending} className={quietButtonClass}>
            {deletePending ? "Deleting..." : "Delete collection"}
          </button>
        </form>
      ) : null}
    </li>
  );
}
