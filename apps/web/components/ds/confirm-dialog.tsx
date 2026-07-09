"use client";

import { useEffect, useId, useRef } from "react";

import { Button } from "./button";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  tone = "danger",
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const onCancelEvent = (event: Event) => {
      event.preventDefault();
      if (!pending) {
        onCancel();
      }
    };
    dialog.addEventListener("cancel", onCancelEvent);
    return () => dialog.removeEventListener("cancel", onCancelEvent);
  }, [onCancel, pending]);

  return (
    <dialog
      ref={dialogRef}
      className="dby-confirm"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={(event) => {
        if (event.target === dialogRef.current && !pending) {
          onCancel();
        }
      }}
    >
      <div className="dby-confirm__panel">
        <h2 id={titleId} className="dby-confirm__title">
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="dby-confirm__desc">
            {description}
          </p>
        ) : null}
        <div className="dby-confirm__actions">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === "danger" ? "danger" : "primary"}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
