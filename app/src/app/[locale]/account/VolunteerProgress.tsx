"use client";

export function VolunteerProgress({
  completed,
  threshold,
}: {
  completed: number;
  threshold: number;
}) {
  const pct = Math.min(Math.round((completed / threshold) * 100), 100);
  const reached = completed >= threshold;

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

      <p className="mt-2 text-sm text-ink-soft">
        {reached
          ? "Поздравляем! Вы выполнили норму — организаторы свяжутся с вами по поводу награды."
          : `Ещё ${threshold - completed} ${plural(threshold - completed, "этап", "этапа", "этапов")} — и вы получите бесплатный слот на забег.`}
      </p>
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
