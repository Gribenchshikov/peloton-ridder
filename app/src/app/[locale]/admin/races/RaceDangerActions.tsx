"use client";

import { useActionState, useEffect, useState } from "react";
import type { RaceDangerState } from "./actions";

type Action = (prev: RaceDangerState, formData: FormData) => Promise<RaceDangerState>;

const ERRORS: Record<string, string> = {
  unauthorized: "Недостаточно прав",
  not_found: "Трасса не найдена",
  hasLinkedData:
    "Нельзя удалить: есть события, регистрации, трансфер, оплаты или другие данные. Сначала очистите данные.",
};

function DangerButton({
  label,
  confirmLabel,
  action,
  tone,
  successMessage,
}: {
  label: string;
  confirmLabel: string;
  action: Action;
  tone: "muted" | "danger";
  successMessage?: string;
}) {
  const [confirm, setConfirm] = useState(false);
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.cleared) setConfirm(false);
  }, [state.cleared]);

  return (
    <div className="flex flex-col gap-2">
      {state.cleared && successMessage && (
        <p className="rounded-[var(--radius-s)] bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {successMessage}
        </p>
      )}
      {!confirm ? (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className={
            tone === "danger"
              ? "self-start rounded-[var(--radius-s)] bg-red-600 px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
              : "self-start rounded-[var(--radius-s)] border border-danger/40 px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/5"
          }
        >
          {label}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink">Вы действительно хотите?</p>
          {state.error && (
            <p className="max-w-xs text-sm text-danger">{ERRORS[state.error] ?? "Не удалось выполнить действие"}</p>
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
                {pending ? "…" : confirmLabel}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function RaceDangerActions({
  clearAction,
  deleteAction,
}: {
  clearAction: Action;
  deleteAction: Action;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8">
      <div className="flex flex-wrap items-start gap-8">
        <div className="flex max-w-xs flex-col gap-2">
          <p className="text-xs text-ink-faint">
            Удаляет события и всё, что к ним привязано: регистрации, трансфер, оплаты, дистанции, результаты. Карточка трассы остаётся.
          </p>
          <DangerButton
            label="Очистить данные"
            confirmLabel="Да, очистить"
            action={clearAction}
            tone="muted"
            successMessage="Данные трассы очищены"
          />
        </div>
        <div className="flex max-w-xs flex-col gap-2">
          <p className="text-xs text-ink-faint">
            Удаляет саму трассу, только если нет связанных событий, регистраций, трансфера, оплат и других данных.
          </p>
          <DangerButton label="Удалить" confirmLabel="Да, удалить" action={deleteAction} tone="danger" />
        </div>
      </div>
    </section>
  );
}
