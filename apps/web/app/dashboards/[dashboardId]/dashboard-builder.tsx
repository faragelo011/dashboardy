"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type {
  Collection,
  DashboardDefinition,
  DashboardEditorDetail,
  DashboardWidgetUpdateInput,
  FilterValue,
  GlobalFilter,
  GlobalFilterValueType,
  ParameterDefinition,
  SavedQuestionSummary,
} from "@dashboardy/types";

import { ApiError, updateDashboard } from "@/app/lib/dashboards-api";

import { DashboardFilterBar, filterInputForType } from "./dashboard-filter-bar";
import { initialGlobalFilterValues } from "./dashboard-filter-state";
import { DashboardGrid, type EditableWidget } from "./dashboard-grid";

type DashboardBuilderProps = {
  accessToken: string;
  workspaceId: string;
  initial: DashboardEditorDetail;
  collections: Collection[];
  questions: SavedQuestionSummary[];
  questionParametersById: Record<string, ParameterDefinition[]>;
};

function uniqueFilterId(existing: GlobalFilter[]): string {
  const used = new Set(existing.map((filter) => filter.id));
  let candidate = "";
  do {
    candidate = `gf_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
  } while (used.has(candidate));
  return candidate;
}

function emptyFilter(existing: GlobalFilter[]): GlobalFilter {
  return {
    id: uniqueFilterId(existing),
    label: `Filter ${existing.length + 1}`,
    value_type: "string",
    default_value: "",
  };
}

function coerceDefaultValue(
  valueType: GlobalFilterValueType,
  raw: string,
): FilterValue {
  switch (valueType) {
    case "number": {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    case "boolean": {
      const normalized = raw.trim().toLowerCase();
      if (["true", "1", "yes", "on"].includes(normalized)) {
        return true;
      }
      return false;
    }
    default:
      return raw;
  }
}

export function DashboardBuilder({
  accessToken,
  workspaceId,
  initial,
  collections,
  questions,
  questionParametersById,
}: DashboardBuilderProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [collectionId, setCollectionId] = useState(initial.collection_id);
  const [updatedAt, setUpdatedAt] = useState(initial.updated_at);
  const [definition, setDefinition] = useState<DashboardDefinition>(initial.definition);
  const [widgets, setWidgets] = useState<EditableWidget[]>(initial.widgets);
  const [filterValues, setFilterValues] = useState(() =>
    initialGlobalFilterValues(initial.definition.global_filters),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const addGlobalFilter = () => {
    const next = emptyFilter(definition.global_filters);
    const nextDefinition = {
      ...definition,
      global_filters: [...definition.global_filters, next],
    };
    setDefinition(nextDefinition);
    setFilterValues((prev) => ({ ...prev, [next.id]: next.default_value }));
  };

  const updateGlobalFilter = (index: number, patch: Partial<GlobalFilter>) => {
    const previous = definition.global_filters[index];
    if (!previous) {
      return;
    }

    let nextFilter: GlobalFilter = { ...previous, ...patch };
    if (patch.value_type !== undefined && patch.default_value === undefined) {
      nextFilter = {
        ...nextFilter,
        default_value: coerceDefaultValue(
          nextFilter.value_type,
          String(previous.default_value),
        ),
      };
    }
    if (typeof patch.default_value === "string") {
      nextFilter = {
        ...nextFilter,
        default_value: coerceDefaultValue(nextFilter.value_type, patch.default_value),
      };
    }

    const filters = definition.global_filters.map((gf, i) =>
      i === index ? nextFilter : gf,
    );
    setDefinition({ ...definition, global_filters: filters });

    if (patch.id !== undefined && patch.id !== previous.id) {
      const oldId = previous.id;
      const newId = patch.id.trim();
      const idTaken = definition.global_filters.some(
        (gf, i) => i !== index && gf.id === newId,
      );
      if (newId && !idTaken) {
        setFilterValues((prev) => {
          const next = { ...prev };
          if (oldId in next) {
            next[newId] = next[oldId];
            delete next[oldId];
          }
          return next;
        });
        setWidgets((prev) =>
          prev.map((w) => {
            const bindings = { ...(w.filter_bindings ?? {}) };
            const overrides = { ...(w.filter_overrides ?? {}) };
            if (oldId in bindings) {
              bindings[newId] = bindings[oldId];
              delete bindings[oldId];
            }
            if (oldId in overrides) {
              overrides[newId] = overrides[oldId];
              delete overrides[oldId];
            }
            return { ...w, filter_bindings: bindings, filter_overrides: overrides };
          }),
        );
      }
    } else if (patch.default_value !== undefined || patch.value_type !== undefined) {
      setFilterValues((prev) => ({
        ...prev,
        [nextFilter.id]: nextFilter.default_value,
      }));
    }
  };

  const removeGlobalFilter = (index: number) => {
    const removed = definition.global_filters[index];
    const filters = definition.global_filters.filter((_, i) => i !== index);
    setDefinition({ ...definition, global_filters: filters });
    if (removed) {
      setFilterValues((prev) => {
        const next = { ...prev };
        delete next[removed.id];
        return next;
      });
      setWidgets((prev) =>
        prev.map((w) => {
          const bindings = { ...(w.filter_bindings ?? {}) };
          const overrides = { ...(w.filter_overrides ?? {}) };
          delete bindings[removed.id];
          delete overrides[removed.id];
          return { ...w, filter_bindings: bindings, filter_overrides: overrides };
        }),
      );
    }
  };

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
          definition,
          widgets: payloadWidgets,
        });
        setUpdatedAt(saved.updated_at);
        if (saved.detail_level === "editor") {
          setWidgets(saved.widgets);
          setDefinition(saved.definition);
          setFilterValues(initialGlobalFilterValues(saved.definition.global_filters));
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
              {!collections.some((c) => c.id === collectionId) ? (
                <option value={collectionId} disabled>
                  Current collection
                </option>
              ) : null}
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

      <section className="ds-card flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-ink-strong">Global filter definitions</h2>
          <button type="button" className="ds-btn ds-btn-secondary" onClick={addGlobalFilter}>
            Add filter
          </button>
        </div>
        {definition.global_filters.length === 0 ? (
          <p className="ds-help">No global filters configured.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {definition.global_filters.map((filter, index) => (
              <li
                key={`${filter.id}-${index}`}
                className="grid gap-3 border border-border-1 p-3 sm:grid-cols-2 lg:grid-cols-5"
              >
                <label className="flex flex-col gap-1">
                  <span className="ds-label">Id</span>
                  <input
                    className="ds-input"
                    value={filter.id}
                    onChange={(e) => updateGlobalFilter(index, { id: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="ds-label">Label</span>
                  <input
                    className="ds-input"
                    value={filter.label}
                    onChange={(e) => updateGlobalFilter(index, { label: e.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="ds-label">Type</span>
                  <select
                    className="ds-input"
                    value={filter.value_type}
                    onChange={(e) =>
                      updateGlobalFilter(index, {
                        value_type: e.target.value as GlobalFilterValueType,
                      })
                    }
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="date">date</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="ds-label">Default</span>
                  {filterInputForType(
                    filter.value_type,
                    filter.default_value,
                    (next) => updateGlobalFilter(index, { default_value: next }),
                  )}
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    className="ds-btn ds-btn-secondary"
                    onClick={() => removeGlobalFilter(index)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DashboardFilterBar
        globalFilters={definition.global_filters}
        values={filterValues}
        onChange={setFilterValues}
      />

      <DashboardGrid
        accessToken={accessToken}
        workspaceId={workspaceId}
        dashboardId={initial.id}
        widgets={widgets}
        mode="edit"
        questions={questions}
        globalFilters={definition.global_filters}
        globalFilterValues={filterValues}
        questionParametersById={questionParametersById}
        onWidgetsChange={setWidgets}
      />
    </div>
  );
}
