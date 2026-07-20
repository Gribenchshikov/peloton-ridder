"use client";

import { useTransition, useState } from "react";
import { claimVolunteerRewardAction } from "./volunteerActions";

export function VolunteerProgress({
  completed,
  threshold,
  alreadyClaimed,
}: {
  completed: number;
  threshold: number;
  alreadyClaimed: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [claimed, setClaimed] = useState(alreadyClaimed);
  const [error, setError] = useState<string | null>(null);

  const pct = Math.min(Math.round((completed / threshold) * 100), 100);
  const reached = completed >= threshold;

  function handleClaim() {
    startTransition(async () => {
      const res = await claimVolunteerRewardAction();
      if (res.ok) setClaimed(true);
      else if (res.error === "already_claimed") setClaimed(true);
      else setError("Не удалось отправить запрос. Попробуйте позже.");
    });
  }

  return (
    <section className="rounded-[var(--radius-m)] border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/20">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold text-ink">Прогресс волонтёра</h2>
        <span className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">
          {completed} / {threshold}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-amber-100 dark:bg-amber-900/40">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-sm text-ink-soft">
        {reached
          ? "Ты прошёл все этапы — заберите ваш бесплатный слот!"
          : `Ещё ${threshold - completed} ${plural(threshold - completed, "этап", "этапа", "этапов")} — и ты получишь бесплатный слот на забег.`}
      </p>

      {reached && (
        <div className="mt-4">
          {claimed ? (
            <p className="inline-flex items-center gap-1.5 rounded-[var(--radius-s)] bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              ✓ Награда уже получена — ожидайте ваучер от организаторов
            </p>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={handleClaim}
              className="rounded-[var(--radius-s)] bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
            >
              {isPending ? "Отправляем запрос…" : "Забрать награду — 100% ваучер"}
            </button>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
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
