"use client";

import { useState } from "react";

type Props = {
  deleteAction: () => Promise<void>;
  deleteLabel: string;
  confirmLabel: string;
  cancelLabel: string;
};

export function DeleteButton({ deleteAction, deleteLabel, confirmLabel, cancelLabel }: Props) {
  const [confirm, setConfirm] = useState(false);

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="ml-auto text-sm font-semibold text-ink-faint transition-colors hover:text-red-500"
      >
        {deleteLabel}
      </button>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-2">
      <button
        type="button"
        onClick={() => setConfirm(false)}
        className="text-sm font-semibold text-ink-faint"
      >
        {cancelLabel}
      </button>
      <form action={deleteAction}>
        <button
          type="submit"
          className="rounded-[var(--radius-s)] bg-red-600 px-3 py-1.5 text-sm font-bold text-white"
        >
          {confirmLabel}
        </button>
      </form>
    </div>
  );
}
