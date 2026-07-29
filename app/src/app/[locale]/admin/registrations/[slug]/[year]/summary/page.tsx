import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { requireAdminPage } from "@/lib/session";
import { getEventSummary } from "@/lib/queries";

export default async function EventSummaryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; year: string }>;
}) {
  const { locale, slug, year } = await params;
  await requireAdminPage(locale, `/admin/registrations/${slug}/${year}/summary`);

  const yearNum = Number(year);
  if (!Number.isInteger(yearNum)) notFound();

  const event = await getEventSummary(slug, yearNum);
  if (!event) notFound();

  const regs = event.registrations;
  const paid = regs.filter((r) => r.status === "PAID");
  const raceDate = event.dateISO;

  // Age groups (по дате старта)
  const ageGroups: Record<string, number> = { "<18": 0, "18–29": 0, "30–39": 0, "40–49": 0, "50+": 0, "н/д": 0 };
  for (const r of paid) {
    if (!r.user.birthDate) { ageGroups["н/д"]++; continue; }
    const age = Math.floor((raceDate.getTime() - r.user.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18) ageGroups["<18"]++;
    else if (age < 30) ageGroups["18–29"]++;
    else if (age < 40) ageGroups["30–39"]++;
    else if (age < 50) ageGroups["40–49"]++;
    else ageGroups["50+"]++;
  }

  // T-shirt sizes: берём из мерча события, иначе из профиля
  const tshirtSizes: Record<string, number> = {};
  for (const r of paid) {
    const merchSize = r.registrationMerch.find((m) => m.merchItem.requiresSize)?.size;
    const size = merchSize ?? r.user.tshirtSize ?? "н/д";
    tshirtSizes[size] = (tshirtSizes[size] ?? 0) + 1;
  }
  const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "н/д"];

  // По дистанциям
  const byDistance = event.distances.map((d) => {
    const dRegs = regs.filter((r) => r.distanceId === d.id);
    const bibCap = (d.bibRangeStart !== null && d.bibRangeEnd !== null) ? d.bibRangeEnd - d.bibRangeStart + 1 : null;
    const capacity = bibCap !== null
      ? (d.maxSlots !== null ? Math.min(d.maxSlots, bibCap) : bibCap)
      : d.maxSlots;
    return { ...d, total: dRegs.length, paid: dRegs.filter((r) => r.status === "PAID").length, capacity };
  });

  // Города
  const cities: Record<string, number> = {};
  for (const r of paid) {
    const city = r.user.city?.trim() || "н/д";
    cities[city] = (cities[city] ?? 0) + 1;
  }
  const topCities = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Трансфер
  const transferCount = paid.filter((r) => r.transferUsedAt).length;

  const backHref = `/admin/registrations/${slug}/${year}`;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      {/* Header */}
      <div>
        <Link href={backHref} className="text-sm font-semibold text-ink-faint transition-colors hover:text-ink">
          ← {event.race.name} {event.year} — регистрации
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">Сводка по забегу</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Только оплаченные регистрации · всего {paid.length} участников
        </p>
      </div>

      {/* По дистанциям */}
      <Section title="Дистанции">
        <div className="overflow-x-auto rounded-[var(--radius-m)] border border-border">
          <table className="w-full min-w-[400px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-2.5 text-left">Дистанция</th>
                <th className="px-4 py-2.5 text-right">Оплачено</th>
                <th className="px-4 py-2.5 text-right">Активных</th>
                <th className="px-4 py-2.5 text-right">Лимит</th>
                <th className="px-4 py-2.5 text-right">Заполнено</th>
              </tr>
            </thead>
            <tbody>
              {byDistance.map((d) => {
                const pct = (d.capacity != null && d.capacity > 0) ? Math.round((d.paid / d.capacity) * 100) : 0;
                return (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium text-ink">{d.name} <span className="text-ink-faint">({d.km} км)</span></td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink">{d.paid}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{d.total}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{d.capacity ?? "∞"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-semibold tabular-nums ${pct >= 90 ? "text-danger" : pct >= 70 ? "text-warn" : "text-ink-soft"}`}>
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Возраст */}
        <Section title="Возраст участников">
          <BarChart
            data={Object.entries(ageGroups).filter(([, v]) => v > 0)}
            total={paid.length}
          />
        </Section>

        {/* Размеры футболок */}
        {Object.keys(tshirtSizes).length > 0 && (
          <Section title="Размеры футболок">
            <BarChart
              data={SIZE_ORDER.map((s) => [s, tshirtSizes[s] ?? 0]).filter(([, v]) => (v as number) > 0) as [string, number][]}
              total={paid.length}
            />
          </Section>
        )}

        {/* Топ городов */}
        {topCities.length > 0 && (
          <Section title="Города">
            <BarChart data={topCities} total={paid.length} />
          </Section>
        )}

        {/* Трансфер */}
        {event.transferPrice && (
          <Section title="Трансфер">
            <div className="flex items-end gap-3">
              <span className="font-display text-4xl font-bold text-ink">{transferCount}</span>
              <span className="pb-1 text-sm text-ink-soft">из {paid.length} участников</span>
            </div>
            <p className="mt-2 text-xs text-ink-faint">Стоимость: {event.transferPrice.toLocaleString("ru")} ₸ / чел.</p>
            <p className="mt-0.5 text-xs font-semibold text-ink-soft">
              Итого: ~{(transferCount * event.transferPrice).toLocaleString("ru")} ₸
            </p>
          </Section>
        )}
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-base font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function BarChart({ data, total }: { data: [string, number][]; total: number }) {
  const max = Math.max(...data.map(([, v]) => v), 1);
  return (
    <div className="flex flex-col gap-2">
      {data.map(([label, count]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-ink-soft">{label}</span>
          <div className="flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-2 rounded-full bg-ember transition-all"
              style={{ width: `${Math.round((count / max) * 100)}%` }}
            />
          </div>
          <span className="w-14 shrink-0 text-right text-xs tabular-nums text-ink-faint">
            {count} <span className="text-ink-faint/60">({total > 0 ? Math.round((count / total) * 100) : 0}%)</span>
          </span>
        </div>
      ))}
    </div>
  );
}
