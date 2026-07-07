"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import type { Collection } from "@dashboardy/types";

import { ApiError, cloneDashboard } from "@/app/lib/dashboards-api";
import { listCollections } from "@/app/lib/questions-api";
import { Button } from "@/components/ds/button";

type CloneActionProps = {
  accessToken: string;
  workspaceId: string;
  dashboardId: string;
};

export function CloneDashboardAction({
  accessToken,
  workspaceId,
  dashboardId,
}: CloneActionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadCollections = () => {
    if (collectionsLoading) {
      return;
    }
    setCollectionsLoading(true);
    setCollectionsError(null);
    void listCollections(accessToken, workspaceId)
      .then((response) => {
        setCollections(response.collections.filter((c) => c.permission === "edit"));
      })
      .catch((err) => {
        console.error("failed to load clone target collections", { workspaceId, err });
        setCollectionsError("Could not load collections to clone into.");
        setCollections([]);
      })
      .finally(() => {
        setCollectionsLoading(false);
        setCollectionsLoaded(true);
      });
  };

  const openClone = () => {
    setOpen(true);
    if (!collectionsLoaded) {
      loadCollections();
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const targetCollectionId = String(form.get("target_collection_id") ?? "");
    const title = String(form.get("title") ?? "").trim();
    if (!targetCollectionId) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const cloned = await cloneDashboard(accessToken, workspaceId, dashboardId, {
          target_collection_id: targetCollectionId,
          ...(title ? { title } : {}),
        });
        setOpen(false);
        router.push(`/dashboards/${cloned.id}/edit`);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to clone dashboard.",
        );
      }
    });
  };

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={openClone}>
        Clone
      </Button>
    );
  }

  if (collectionsLoading) {
    return (
      <Button type="button" variant="secondary" disabled>
        Loading collections…
      </Button>
    );
  }

  if (collectionsError) {
    return (
      <div className="flex flex-col gap-1">
        <Button type="button" variant="secondary" onClick={openClone}>
          Clone
        </Button>
        <p className="text-xs text-danger-ink" role="alert">
          {collectionsError}
        </p>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <Button type="button" variant="secondary" disabled>
          Clone
        </Button>
        <p className="text-xs text-ink-muted" role="status">
          No collections available to clone into.
        </p>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-border-1 bg-surface-1 p-3"
    >
      <label className="flex flex-col gap-1.5">
        <span className="ds-label">Clone into</span>
        <select name="target_collection_id" required className="ds-input min-w-[200px]">
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="ds-label">Title (optional)</span>
        <input name="title" className="ds-input min-w-[220px]" placeholder="Executive KPIs (Copy)" />
      </label>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Cloning…" : "Clone"}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error ? (
        <p className="w-full text-sm text-danger-ink" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
