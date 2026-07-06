"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import type { Collection, DashboardSummary } from "@dashboardy/types";

import { ApiError, createDashboard, deleteDashboard } from "@/app/lib/dashboards-api";

type CreateProps = {
  accessToken: string;
  workspaceId: string;
  collections: Collection[];
  canEdit: boolean;
};

export function DashboardCreateForm({
  accessToken,
  workspaceId,
  collections,
  canEdit,
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
    <form onSubmit={submit} className="ds-card flex flex-col gap-4 p-5">
      <h2 className="text-sm font-semibold text-ink-strong">New dashboard</h2>
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
        />
      </label>
      {error ? (
        <p className="text-sm text-danger-ink" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="ds-btn ds-btn-primary">
        {pending ? "Creating…" : "Create dashboard"}
      </button>
    </form>
  );
}

type RowProps = {
  accessToken: string;
  workspaceId: string;
  dashboard: DashboardSummary;
  canEdit: boolean;
};

export function DashboardRow({
  accessToken,
  workspaceId,
  dashboard,
  canEdit,
}: RowProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    if (!confirm(`Delete dashboard "${dashboard.title}"?`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteDashboard(accessToken, workspaceId, dashboard.id);
        router.refresh();
      } catch (err) {
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
    <li className="ds-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Link
          href={`/dashboards/${dashboard.id}`}
          className="font-medium text-ink-strong hover:text-accent"
        >
          {dashboard.title}
        </Link>
        <p className="text-xs text-ink-muted">
          Updated {new Date(dashboard.updated_at).toLocaleString()}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/dashboards/${dashboard.id}`}
          className="ds-btn ds-btn-secondary text-xs"
        >
          View
        </Link>
        {canEdit ? (
          <>
            <Link
              href={`/dashboards/${dashboard.id}/edit`}
              className="ds-btn ds-btn-secondary text-xs"
            >
              Edit
            </Link>
            <button
              type="button"
              className="ds-btn ds-btn-secondary text-xs"
              disabled={pending}
              onClick={remove}
            >
              Delete
            </button>
          </>
        ) : null}
      </div>
      {error ? (
        <p className="w-full text-sm text-danger-ink" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}
