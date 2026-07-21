import type { getUserSeriesProgress } from "@/lib/queries";
import { Link } from "@/i18n/navigation";

type Progress = NonNullable<Awaited<ReturnType<typeof getUserSeriesProgress>>>;

export function SeriesMedals({ progress, year }: { progress: Progress; year: number }) {
  const stages = progress.seriesRaces;
  const completedCount = stages.filter((sr) => sr.race.events[0]?.results.length).length;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-ink">
          {progress.name} {year}
        </h2>
        <Link href="/series" className="text-sm font-semibold text-ember hover:underline">
          Таблица зачёта →
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {stages.map((sr) => {
          const result = sr.race.events[0]?.results[0];
          const done = !!result;
          const event = sr.race.events[0];
          return (
            <div
              key={sr.id}
              className={`flex flex-col items-center gap-1.5 rounded-[var(--radius-m)] border px-4 py-3 text-center transition-colors ${
                done
                  ? "border-spruce/40 bg-spruce/8"
                  : "border-border bg-surface-2"
              }`}
              style={{ minWidth: "80px" }}
            >
              {/* Медаль SVG */}
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle
                  cx="18"
                  cy="20"
                  r="13"
                  fill={done ? "var(--color-spruce, #3a6b3c)" : "none"}
                  stroke={done ? "var(--color-spruce, #3a6b3c)" : "var(--color-border, #ccc)"}
                  strokeWidth="2"
                  opacity={done ? 1 : 0.5}
                />
                {done && (
                  <text
                    x="18"
                    y="25"
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="bold"
                    fill="white"
                  >
                    {sr.stageOrder}
                  </text>
                )}
                {!done && (
                  <text
                    x="18"
                    y="25"
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="bold"
                    fill="var(--color-ink-faint, #999)"
                  >
                    {sr.stageOrder}
                  </text>
                )}
                {/* Лента медали */}
                <path
                  d="M14 7 L18 10 L22 7 L20 3 L16 3 Z"
                  fill={done ? "var(--color-ember, #e05a2a)" : "var(--color-border, #ccc)"}
                  opacity={done ? 1 : 0.4}
                />
              </svg>

              <p className="text-xs font-semibold text-ink truncate max-w-[80px]" title={sr.race.name}>
                {sr.race.name.split(" ").slice(0, 2).join(" ")}
              </p>
              {done && result.place && (
                <p className="text-[10px] font-bold text-spruce">#{result.place}</p>
              )}
              {done && result.time && (
                <p className="text-[10px] text-ink-faint">{result.time}</p>
              )}
              {!done && event && (
                <p className="text-[10px] text-ink-faint">
                  {new Date(event.dateISO) > new Date() ? "Впереди" : "Нет данных"}
                </p>
              )}
              {!done && !event && (
                <p className="text-[10px] text-ink-faint">—</p>
              )}
            </div>
          );
        })}
      </div>

      {completedCount > 0 && (
        <p className="mt-3 text-sm text-ink-soft">
          Завершено {completedCount} из {stages.length} этапов сезона {year}.
        </p>
      )}
    </section>
  );
}
