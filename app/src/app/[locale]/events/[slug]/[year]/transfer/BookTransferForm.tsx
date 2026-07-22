"use client";

import { useActionState } from "react";
import { bookTransferAction, type BookTransferState } from "./bookTransferAction";

const ERRORS: Record<string, string> = {
  unavailable: "Трансфер недоступен для этого забега.",
  closed: "Регистрация уже закрыта.",
  already_booked: "У вас уже есть активная запись на этот старт.",
  invalid: "Ошибка запроса. Попробуйте снова.",
};

export function BookTransferForm({ eventId, locale }: { eventId: string; locale: string }) {
  const boundAction = bookTransferAction.bind(null, locale);
  const [state, formAction, pending] = useActionState<BookTransferState, FormData>(boundAction, {});

  return (
    <form action={formAction} className="mt-5">
      <input type="hidden" name="eventId" value={eventId} />
      {state.error && (
        <p className="mb-3 text-sm font-semibold text-danger">
          {ERRORS[state.error] ?? "Произошла ошибка."}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
      >
        {pending ? "Секунду…" : "Заказать трансфер"}
      </button>
    </form>
  );
}
