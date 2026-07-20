"use client";

import { useActionState } from "react";
import { deletePromoAction } from "../actions";

type Props = { promoId: string; locale: string; label: string };

export function DeletePromoButton({ promoId, locale, label }: Props) {
  const action = deletePromoAction.bind(null, locale, promoId);
  const [, dispatch] = useActionState(action, {});
  return (
    <form action={dispatch}>
      <button
        type="submit"
        className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-surface-2"
        onClick={(e) => { if (!confirm("Удалить промокод?")) e.preventDefault(); }}
      >
        {label}
      </button>
    </form>
  );
}
