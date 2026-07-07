"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import type { Collection } from "@dashboardy/types";

import { ApiError, cloneDashboard } from "@/app/lib/dashboards-api";
import { Button } from "@/components/ds/button";

type CloneActionProps = {
  accessToken: string;
  workspaceId: string;
  dashboardId: string;
  collections: Collection[];
};

export function CloneDashboardAction({
  accessToken,
  workspaceId,
  dashboardId,
  collections,
}: CloneActionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (collections.length === 0) {
    return null;
  }

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

  return open ? (
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
  ) : (
    <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
      Clone
    </Button>
  );
}

