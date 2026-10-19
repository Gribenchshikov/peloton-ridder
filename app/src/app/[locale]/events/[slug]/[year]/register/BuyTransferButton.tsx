"use client";

import { useActionState } from "react";
import { buyTransferAction, type BuyTransferState } from "./buyTransferAction";

export function BuyTransferButton({
  registrationId,
  price,
  location,
  locale,
  alreadyHasTransfer = false,
}: {
  registrationId: string;
  price: number;
  location: string;
  locale: string;
  alreadyHasTransfer?: boolean;
}) {
  const boundAction = buyTransferAction.bind(null, locale, registrationId);
  const [state, formAction, pending] = useActionState(boundAction, {});

  return (
    <div className="mt-4 rounded-[var(--radius-s)] border border-border bg-surface-2 p-4">
      {alreadyHasTransfer && (
        <p className="mb-3 text-sm font-semibold text-spruce">✓ Трансфер уже оформлен</p>
      )}
      <p className="text-sm font-semibold text-ink">Трансфер до старта</p>
      <p className="mt-0.5 text-xs text-ink-soft">Риддер → {location || "место старта"} и обратно</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold text-ink">{price.toLocaleString("ru-KZ")} ₸</span>
        <form action={formAction}>
          <button
            type="submit"
            disabled={pending}
            className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-50"
          >
            {pending ? "Добавляем…" : alreadyHasTransfer ? "Купить ещё" : "Купить трансфер"}
          </button>
        </form>
      </div>
      {state.error && (
        <p className="mt-2 text-xs text-danger">Не удалось добавить трансфер. Попробуйте позже.</p>
      )}
    </div>
  );
}
