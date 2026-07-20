"use client";

import { useActionState } from "react";
import { deleteSeriesAction } from "../actions";

type Props = { seriesId: string; locale: string; label: string };

export function DeleteSeriesButton({ seriesId, locale, label }: Props) {
  const action = deleteSeriesAction.bind(null, locale, seriesId);
  const [, dispatch] = useActionState(action, {});

  return (
    <form action={dispatch}>
      <button
        type="submit"
        className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-surface-2"
        onClick={(e) => {
          if (!confirm("Удалить серию?")) e.preventDefault();
        }}
      >
        {label}
      </button>
    </form>
  );
}
