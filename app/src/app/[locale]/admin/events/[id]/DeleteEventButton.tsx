"use client";

import { useState, useActionState } from "react";
import type { ActionState } from "../actions";

type Props = {
  action: (_prev: ActionState, _fd: FormData) => Promise<ActionState>;
};

export function DeleteEventButton({ action }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [state, formAction, pending] = useActionState(action, {});

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="text-sm font-semibold text-danger hover:underline"
      >
        Удалить событие
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {state.error && (
        <p className="text-sm text-danger">
          {state.error === "hasRegistrations"
            ? "Невозможно удалить: есть оплаченные регистрации"
            : "Ошибка при удалении"}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setConfirm(false)}
          className="text-sm text-ink-faint hover:text-ink"
        >
          Отмена
        </button>
        <form action={formAction}>
          <button
            type="submit"
            disabled={pending}
            className="rounded-[var(--radius-s)] bg-red-600 px-4 py-1.5 text-sm font-bold text-white transition-opacity disabled:opacity-50"
          >
            {pending ? "Удаление…" : "Да, удалить"}
          </button>
        </form>
      </div>
    </div>
  );
}
