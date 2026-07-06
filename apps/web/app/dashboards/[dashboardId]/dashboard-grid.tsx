"use client";

import { useCallback, useRef, useState, type CSSProperties, type PointerEvent } from "react";

import type {
  DashboardWidget,
  DashboardWidgetConsumer,
  DashboardWidgetCreateInput,
  SavedQuestionSummary,
  WidgetLayout,
} from "@dashboardy/types";

import { BarWidget } from "./widgets/bar-widget";
import { KpiWidget } from "./widgets/kpi-widget";
import { LineWidget } from "./widgets/line-widget";
import { TableWidget } from "./widgets/table-widget";

export type EditableWidget = DashboardWidget | DashboardWidgetCreateInput & { id?: string };

type DashboardGridProps = {
  accessToken: string;
  workspaceId: string;
  dashboardId: string;
  widgets: (DashboardWidget | DashboardWidgetConsumer | EditableWidget)[];
  mode?: "view" | "edit";
  questions?: SavedQuestionSummary[];
  onWidgetsChange?: (widgets: EditableWidget[]) => void;
};

const COLS = 12;
const ROW_HEIGHT = 80;

function layoutStyle(layout: WidgetLayout): CSSProperties {
  return {
    gridColumn: `${layout.x + 1} / span ${layout.w}`,
    gridRow: `${layout.y + 1} / span ${layout.h}`,
  };
}

function WidgetBody({
  accessToken,
  workspaceId,
  dashboardId,
  widget,
}: {
  accessToken: string;
  workspaceId: string;
  dashboardId: string;
  widget: DashboardWidget | DashboardWidgetConsumer;
}) {
  const id = widget.id;
  const common = {
    accessToken,
    workspaceId,
    dashboardId,
    widgetId: id,
    title: widget.title,
  };
  switch (widget.widget_type) {
    case "kpi":
      return <KpiWidget {...common} />;
    case "bar":
      return <BarWidget {...common} />;
    case "line":
      return <LineWidget {...common} />;
    case "table":
      return <TableWidget {...common} />;
    default:
      return (
        <div className="rounded-lg border border-border-1 p-4 text-sm text-ink-muted">
          Unsupported widget type
        </div>
      );
  }
}

export function DashboardGrid({
  accessToken,
  workspaceId,
  dashboardId,
  widgets,
  mode = "view",
  questions = [],
  onWidgetsChange,
}: DashboardGridProps) {
  const [draftType, setDraftType] = useState<"kpi" | "bar" | "line" | "table">("kpi");
  const [draftQuestionId, setDraftQuestionId] = useState("");
  const dragRef = useRef<{
    widgetKey: string;
    startX: number;
    startY: number;
    origin: WidgetLayout;
  } | null>(null);

  const updateWidget = useCallback(
    (index: number, next: EditableWidget) => {
      if (!onWidgetsChange) {
        return;
      }
      const copy = [...widgets];
      copy[index] = next;
      onWidgetsChange(copy as EditableWidget[]);
    },
    [onWidgetsChange, widgets],
  );

  const removeWidget = (index: number) => {
    if (!onWidgetsChange) {
      return;
    }
    onWidgetsChange(widgets.filter((_, i) => i !== index) as EditableWidget[]);
  };

  const addWidget = () => {
    if (!onWidgetsChange || !draftQuestionId) {
      return;
    }
    const maxY = widgets.reduce((acc, w) => Math.max(acc, w.layout.y + w.layout.h), 0);
    const next: EditableWidget = {
      id: crypto.randomUUID(),
      widget_type: draftType,
      saved_question_id: draftQuestionId,
      layout: { x: 0, y: maxY, w: 4, h: draftType === "kpi" ? 2 : 4 },
      config: {},
      filter_bindings: {},
      filter_overrides: {},
    };
    onWidgetsChange([...widgets, next] as EditableWidget[]);
    setDraftQuestionId("");
  };

  const onPointerDown = (
    event: PointerEvent<HTMLDivElement>,
    widgetKey: string,
    layout: WidgetLayout,
    index: number,
  ) => {
    if (mode !== "edit" || !onWidgetsChange) {
      return;
    }
    event.preventDefault();
    dragRef.current = {
      widgetKey,
      startX: event.clientX,
      startY: event.clientY,
      origin: layout,
    };
    const onMove = (moveEvent: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.widgetKey !== widgetKey) {
        return;
      }
      const dx = Math.round((moveEvent.clientX - drag.startX) / 40);
      const dy = Math.round((moveEvent.clientY - drag.startY) / ROW_HEIGHT);
      const nextLayout: WidgetLayout = {
        ...drag.origin,
        x: Math.max(0, Math.min(COLS - drag.origin.w, drag.origin.x + dx)),
        y: Math.max(0, drag.origin.y + dy),
      };
      const widget = widgets[index];
      if (!widget) {
        return;
      }
      updateWidget(index, { ...widget, layout: nextLayout } as EditableWidget);
    };
    const endDrag = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
  };

  const moveWidgetByKeys = (
    index: number,
    dx: number,
    dy: number,
  ) => {
    const widget = widgets[index];
    if (!widget || mode !== "edit" || !onWidgetsChange) {
      return;
    }
    const nextLayout: WidgetLayout = {
      ...widget.layout,
      x: Math.max(0, Math.min(COLS - widget.layout.w, widget.layout.x + dx)),
      y: Math.max(0, widget.layout.y + dy),
    };
    updateWidget(index, { ...widget, layout: nextLayout } as EditableWidget);
  };

  const maxRow = widgets.reduce(
    (acc, w) => Math.max(acc, w.layout.y + w.layout.h),
    1,
  );

  return (
    <div className="flex flex-col gap-4">
      {mode === "edit" && onWidgetsChange ? (
        <div className="ds-card flex flex-wrap items-end gap-3 p-4">
          <label className="flex flex-col gap-1">
            <span className="ds-label">Saved question</span>
            <select
              className="ds-input min-w-[200px]"
              value={draftQuestionId}
              onChange={(e) => setDraftQuestionId(e.target.value)}
            >
              <option value="">Select…</option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="ds-label">Widget type</span>
            <select
              className="ds-input"
              value={draftType}
              onChange={(e) =>
                setDraftType(e.target.value as "kpi" | "bar" | "line" | "table")
              }
            >
              <option value="kpi">KPI</option>
              <option value="bar">Bar</option>
              <option value="line">Line</option>
              <option value="table">Table</option>
            </select>
          </label>
          <button type="button" className="ds-btn ds-btn-primary" onClick={addWidget}>
            Add widget
          </button>
        </div>
      ) : null}

      <div
        className="relative grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          gridAutoRows: `${ROW_HEIGHT}px`,
          minHeight: maxRow * ROW_HEIGHT,
        }}
      >
        {widgets.map((widget, index) => {
          const widgetKey = "id" in widget && widget.id ? widget.id : `new-${index}`;
          const hasId = "id" in widget && Boolean(widget.id);
          return (
            <div
              key={widgetKey}
              style={layoutStyle(widget.layout)}
              className={`relative min-h-0 ${mode === "edit" ? "cursor-grab active:cursor-grabbing" : ""}`}
              tabIndex={mode === "edit" ? 0 : undefined}
              aria-label={
                mode === "edit" ? "Widget layout. Use arrow keys to reposition." : undefined
              }
              onPointerDown={(e) =>
                onPointerDown(e, widgetKey, widget.layout, index)
              }
              onKeyDown={(e) => {
                if (mode !== "edit") {
                  return;
                }
                const deltas: Record<string, [number, number]> = {
                  ArrowLeft: [-1, 0],
                  ArrowRight: [1, 0],
                  ArrowUp: [0, -1],
                  ArrowDown: [0, 1],
                };
                const delta = deltas[e.key];
                if (!delta) {
                  return;
                }
                e.preventDefault();
                moveWidgetByKeys(index, delta[0], delta[1]);
              }}
            >
              {mode === "edit" ? (
                <div className="absolute right-2 top-2 z-10 flex gap-1">
                  <button
                    type="button"
                    className="rounded bg-surface-2 px-2 py-0.5 text-[10px] text-ink-muted hover:text-ink"
                    onClick={() => {
                      const next = {
                        ...widget.layout,
                        w: Math.min(
                          COLS - widget.layout.x,
                          widget.layout.w + 1,
                        ),
                      };
                      updateWidget(index, { ...widget, layout: next } as EditableWidget);
                    }}
                  >
                    W+
                  </button>
                  <button
                    type="button"
                    className="rounded bg-surface-2 px-2 py-0.5 text-[10px] text-ink-muted hover:text-ink"
                    onClick={() => removeWidget(index)}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              {hasId ? (
                <WidgetBody
                  accessToken={accessToken}
                  workspaceId={workspaceId}
                  dashboardId={dashboardId}
                  widget={widget as DashboardWidget | DashboardWidgetConsumer}
                />
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border-2 bg-surface-1 p-4 text-sm text-ink-muted">
                  Save to render widget
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
