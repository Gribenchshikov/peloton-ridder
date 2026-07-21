"use client";

import { useActionState } from "react";
import { claimVolunteerRewardAction, type ClaimRewardState } from "./claimRewardAction";

export function VolunteerProgress({
  completed,
  threshold,
  rewardClaimedAt,
  savedPromoCode,
}: {
  completed: number;
  threshold: number;
  rewardClaimedAt: Date | null;
  savedPromoCode: string | null;
}) {
  const boundAction = claimVolunteerRewardAction.bind(null, threshold);
  const [state, formAction, pending] = useActionState<ClaimRewardState, FormData>(
    boundAction,
    {},
  );

  const pct = Math.min(Math.round((completed / threshold) * 100), 100);
  const reached = completed >= threshold;
  const promoCode = state.code ?? savedPromoCode;
  const claimed = !!rewardClaimedAt || !!promoCode;

  return (
    <section className="rounded-[var(--radius-m)] border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/20">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold text-ink">Прогресс волонтёра</h2>
        <span className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">
          {completed} / {threshold}
        </span>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-amber-100 dark:bg-amber-900/40">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {reached ? (
        claimed ? (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-sm font-semibold text-spruce">
              Награда получена — промокод на бесплатный слот:
            </p>
            <div className="flex items-center gap-3">
              <code className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-1.5 font-mono text-sm font-bold tracking-widest text-ink">
                {promoCode}
              </code>
              <button
                type="button"
                onClick={() => promoCode && navigator.clipboard.writeText(promoCode)}
                className="text-xs font-semibold text-ember hover:underline"
              >
                Копировать
              </button>
            </div>
            <p className="text-xs text-ink-faint">
              Введите этот код при регистрации на любой забег — и участие будет бесплатным.
            </p>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-sm text-ink-soft">
              Поздравляем! Вы выполнили норму — забирайте бесплатный слот на забег.
            </p>
            <form action={formAction}>
              <button
                type="submit"
                disabled={pending}
                className="rounded-[var(--radius-s)] bg-amber-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
              >
                {pending ? "Оформляем…" : "Забрать промокод"}
              </button>
            </form>
            {state.error && (
              <p className="text-xs text-danger">Не удалось оформить. Попробуйте снова.</p>
            )}
          </div>
        )
      ) : (
        <p className="mt-2 text-sm text-ink-soft">
          {`Ещё ${threshold - completed} ${plural(threshold - completed, "этап", "этапа", "этапов")} — и вы получите бесплатный слот на забег.`}
        </p>
      )}
    </section>
  );
}

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
