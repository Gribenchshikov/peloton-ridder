import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getSeriesWithRaces, getSeriesSeason, getSeriesAvailableYears } from "@/lib/queries";
import { buildLeaderboard, formatSeconds } from "@/lib/seriesUtils";

export default async function SeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const series = await getSeriesWithRaces();
  if (!series) notFound();

  const availableYears = await getSeriesAvailableYears(series.id);
  const currentYear = new Date().getFullYear();
  const year = yearParam ? Number(yearParam) : (availableYears[0] ?? currentYear);

  const season = await getSeriesSeason(series.id, year);
  if (!season) notFound();

  const leaderboard = buildLeaderboard(season);
  const stageCount = season.seriesRaces.length;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      {/* Header */}
      <div className="mb-10">
        <span className="text-xs font-bold uppercase tracking-wide text-ember">
          Ridder Race Series
        </span>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink">{season.name}</h1>
        {season.description && (
          <p className="mt-2 max-w-2xl text-ink-soft">{season.description}</p>
        )}
      </div>

      {/* Year switcher */}
      {availableYears.length > 1 && (
        <div className="mb-8 flex gap-2">
          {availableYears.map((y) => (
            <Link
              key={y}
              href={y === availableYears[0] ? "/series" : `/series?year=${y}`}
              className={`rounded-[var(--radius-s)] px-4 py-2 text-sm font-semibold transition-colors ${
                y === year
                  ? "bg-ember text-white"
                  : "border border-border text-ink hover:bg-surface-2"
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        {/* Leaderboard */}
        <section>
          <h2 className="mb-4 font-display text-xl font-bold text-ink">
            Зачёт {year}
          </h2>
          {leaderboard.length === 0 ? (
            <div className="rounded-[var(--radius-m)] border border-dashed border-border p-10 text-center text-sm text-ink-faint">
              Результаты пока не опубликованы
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius-m)] border border-border">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th className="px-4 py-2.5 text-left font-semibold text-ink-soft w-10">#</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">Участник</th>
                    <th className="px-4 py-2.5 text-center font-semibold text-ink-soft">Этапы</th>
                    {season.seriesRaces.map((sr) => (
                      <th
                        key={sr.id}
                        className="px-3 py-2.5 text-center font-semibold text-ink-soft text-xs"
                        title={sr.race.name}
                      >
                        Э{sr.stageOrder}
                      </th>
                    ))}
                    <th className="px-4 py-2.5 text-right font-semibold text-ink-soft">Суммарное</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr
                      key={entry.key}
                      className={`border-b border-border last:border-0 ${
                        i < 3 ? "bg-ember/3 dark:bg-ember/5" : "hover:bg-surface-2"
                      }`}
                    >
                      <td className="px-4 py-2.5 text-center font-bold tabular-nums text-ink-soft">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-ink">{entry.name}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums">
                        <span className="font-bold text-ink">{entry.stagesCount}</span>
                        <span className="text-ink-faint">/{stageCount}</span>
                      </td>
                      {season.seriesRaces.map((sr) => {
                        const stage = entry.stages.find((s) => s.stageOrder === sr.stageOrder);
                        return (
                          <td key={sr.id} className="px-3 py-2.5 text-center text-xs tabular-nums">
                            {stage ? (
                              <span className="text-spruce" title={stage.time ?? undefined}>
                                {stage.place ? `#${stage.place}` : "✓"}
                              </span>
                            ) : (
                              <span className="text-ink-faint">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft text-xs">
                        {formatSeconds(entry.totalSeconds)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Stages sidebar */}
        <section>
          <h2 className="mb-4 font-display text-xl font-bold text-ink">Этапы {year}</h2>
          <ol className="flex flex-col gap-3">
            {season.seriesRaces.map((sr) => {
              const event = sr.race.events[0];
              const hasResults = event && event.results.length > 0;
              const isPast = event && new Date(event.dateISO) < new Date();
              return (
                <li
                  key={sr.id}
                  className={`flex items-center gap-3 rounded-[var(--radius-m)] border p-4 ${
                    hasResults
                      ? "border-spruce/30 bg-spruce/5"
                      : isPast
                      ? "border-border bg-surface-2"
                      : "border-border bg-surface"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      hasResults
                        ? "bg-spruce text-white"
                        : "border border-border bg-surface-2 text-ink-faint"
                    }`}
                  >
                    {sr.stageOrder}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink truncate">{sr.race.name}</p>
                    {event ? (
                      <p className="text-xs text-ink-faint">
                        {new Date(event.dateISO).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {hasResults && (
                          <span className="ml-2 text-spruce font-semibold">· Результаты есть</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-ink-faint">Дата не назначена</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </main>
  );
}
