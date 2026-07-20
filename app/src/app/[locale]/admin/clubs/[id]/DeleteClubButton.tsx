"use client";

import { useActionState } from "react";
import { deleteClubAction } from "../actions";

type Props = { clubId: string; locale: string; label: string; disabled?: boolean };

export function DeleteClubButton({ clubId, locale, label, disabled }: Props) {
  const action = deleteClubAction.bind(null, locale, clubId);
  const [, dispatch] = useActionState(action, {});

  return (
    <form action={dispatch}>
      <button
        type="submit"
        disabled={disabled}
        className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
        title={disabled ? "Нельзя удалить — есть регистрации" : undefined}
        onClick={(e) => {
          if (!confirm("Удалить клуб?")) e.preventDefault();
        }}
      >
        {label}
      </button>
    </form>
  );
}
