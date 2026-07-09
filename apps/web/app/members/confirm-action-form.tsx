"use client";

import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ds/confirm-dialog";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  title: string;
  description: string;
  confirmLabel: string;
  buttonLabel: string;
  disabled?: boolean;
  className?: string;
};

export function ConfirmActionForm({
  action,
  fields,
  title,
  description,
  confirmLabel,
  buttonLabel,
  disabled,
  className = "ds-btn ds-btn-ghost ds-btn--sm text-danger-ink hover:bg-danger-soft hover:text-danger-ink",
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const perform = () => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      formData.set(key, value);
    }
    startTransition(() => {
      void Promise.resolve(action(formData)).then(() => {
        setOpen(false);
      });
    });
  };

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled || pending}
        onClick={() => setOpen(true)}
      >
        {pending ? "Working…" : buttonLabel}
      </button>
      <ConfirmDialog
        open={open}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={perform}
      />
    </>
  );
}
