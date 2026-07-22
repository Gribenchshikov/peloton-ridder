import { getTranslations, getFormatter } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";

export default async function HallOfFamePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HallOfFame" });
  const format = await getFormatter({ locale });

  // All completed events with top-3 results
  const events = await prisma.event.findMany({
    where: { status: "COMPLETED", isPublished: true },
    select: {
      id: true,
      year: true,
      dateISO: true,
      race: { select: { name: true, slug: true, color: true } },
      results: {
        where: { place: { in: [1, 2, 3] } },
        orderBy: { place: "asc" },
        select: { id: true, place: true, name: true, time: true, category: true, bibNumber: true },
      },
    },
    orderBy: [{ race: { name: "asc" } }, { year: "desc" }],
  });

  // Group by race
  const byRace = new Map<string, { raceName: string; color: string; slug: string; events: typeof events }>();
  for (const ev of events) {
    const key = ev.race.slug;
    if (!byRace.has(key)) {
      byRace.set(key, { raceName: ev.race.name, color: ev.race.color ?? "#E2531F", slug: key, events: [] });
    }
    if (ev.results.length > 0) byRace.get(key)!.events.push(ev);
  }

  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-6 py-16">
      <div>
        <span className="text-xs font-bold uppercase tracking-wide text-ember">Ridder Race Series</span>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-ink">{t("title")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t("subtitle")}</p>
      </div>

      {byRace.size === 0 ? (
        <p className="text-sm text-ink-faint">{t("empty")}</p>
      ) : (
        [...byRace.values()].map(({ raceName, color, slug, events: raceEvents }) => (
          <section key={slug}>
            <div className="mb-5 flex items-center gap-3">
              <div className="h-5 w-1 rounded-full" style={{ backgroundColor: color }} />
              <h2 className="font-display text-xl font-bold text-ink">{raceName}</h2>
            </div>

            <div className="flex flex-col gap-6">
              {raceEvents.map((ev) => (
                <div key={ev.id}>
                  <div className="mb-3 flex items-center justify-between">
                    <Link
                      href={`/events/${slug}/${ev.year}`}
                      className="text-sm font-semibold text-ink-soft hover:text-ember"
                    >
                      {ev.year} · {format.dateTime(ev.dateISO, { day: "numeric", month: "long" })}
                    </Link>
                  </div>

                  <div className="overflow-x-auto rounded-[var(--radius-m)] border border-border">
                    <table className="w-full min-w-[400px] text-sm">
                      <tbody>
                        {ev.results.map((r) => (
                          <tr key={r.id} className="border-b border-border last:border-0">
                            <td className="w-12 px-4 py-3 text-center text-base">
                              {MEDALS[(r.place ?? 1) - 1] ?? r.place}
                            </td>
                            <td className="px-4 py-3 font-semibold text-ink">{r.name}</td>
                            <td className="px-4 py-3 text-right tabular-nums font-mono text-ink-soft">
                              {r.time ?? "—"}
                            </td>
                            {r.category && (
                              <td className="px-4 py-3 text-right text-xs text-ink-faint">{r.category}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
