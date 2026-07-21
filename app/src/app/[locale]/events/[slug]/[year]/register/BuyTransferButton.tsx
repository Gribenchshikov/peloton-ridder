"use client";

import { useActionState } from "react";
import { buyTransferAction, type BuyTransferState } from "./buyTransferAction";

export function BuyTransferButton({
  registrationId,
  price,
  location,
}: {
  registrationId: string;
  price: number;
  location: string;
}) {
  const boundAction = buyTransferAction.bind(null, registrationId);
  const [state, formAction, pending] = useActionState(boundAction, {});

  if (state.ok) {
    return (
      <div className="mt-4 rounded-[var(--radius-s)] border border-spruce/30 bg-spruce/5 px-4 py-3 text-sm font-semibold text-spruce">
        ✓ Трансфер добавлен
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-[var(--radius-s)] border border-border bg-surface-2 p-4">
      <p className="text-sm font-semibold text-ink">Трансфер до старта</p>
      <p className="mt-0.5 text-xs text-ink-soft">Алматы → {location} и обратно</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold text-ink">{price.toLocaleString("ru-KZ")} ₸</span>
        <form action={formAction}>
          <button
            type="submit"
            disabled={pending}
            className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-50"
          >
            {pending ? "Добавляем…" : "Купить трансфер"}
          </button>
        </form>
      </div>
      {state.error === "already_included" && (
        <p className="mt-2 text-xs text-ink-faint">Трансфер уже включён в регистрацию.</p>
      )}
      {state.error && state.error !== "already_included" && (
        <p className="mt-2 text-xs text-danger">Не удалось добавить трансфер. Попробуйте позже.</p>
      )}
    </div>
  );
}
