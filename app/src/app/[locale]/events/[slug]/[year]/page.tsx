import { notFound } from "next/navigation";
import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/IconSprite";
import { getEventDetail } from "@/lib/queries";
import { groupDistancesByDiscipline } from "@/lib/distanceLabel";
import { formatKzt } from "@/lib/currency";
import { DistanceInfo } from "@/components/DistanceInfo";
import type { Distance } from "@/generated/prisma/client";

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-success-tint text-success",
  DRAFT: "bg-surface-2 text-ink-faint",
  CLOSED: "bg-warn-tint text-warn",
  COMPLETED: "bg-surface-2 text-ink-faint",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string; year: string }>;
}) {
  const { slug, year } = await params;
  const event = await getEventDetail(slug, Number(year));
  if (!event) notFound();

  return <EventDetailView event={event} />;
}

function EventDetailView({ event }: { event: NonNullable<Awaited<ReturnType<typeof getEventDetail>>> }) {
  const t = useTranslations("EventDetail");
  const tStatus = useTranslations("Status");
  const format = useFormatter();

  const equipment = (event.race.equipment as string[] | null) ?? [];
  const { disciplines, noDiscipline: noDisciplineDistances } = groupDistancesByDiscipline(event.distances);

  return (
    <main className="flex-1">
      <section
        className="relative flex min-h-[280px] items-end px-6 py-10"
        style={{ backgroundColor: event.race.color }}
      >
        {event.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative mx-auto w-full max-w-6xl text-white">
          <Link
            href="/events"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-white/85 hover:text-white"
          >
            <Icon name="i-arrow" className="h-4 w-4 rotate-180" />
            {t("backToEvents")}
          </Link>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide backdrop-blur ${STATUS_STYLE[event.status]}`}
          >
            {tStatus(event.status)}
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
            {event.race.name} {event.year}
          </h1>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/90">
            <span className="flex items-center gap-2">
              <Icon name="i-clock" className="h-4 w-4" />
              {format.dateTime(event.dateISO, { day: "numeric", month: "long", year: "numeric" })}
            </span>
            <span className="flex items-center gap-2">
              <Icon name="i-pin" className="h-4 w-4" />
              {event.location}
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="font-display text-xl font-bold text-ink">{t("courseTitle")}</h2>
            <p
              className="mt-3 max-w-2xl text-ink-soft"
              dangerouslySetInnerHTML={{ __html: event.race.courseIntro }}
            />
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-ink">{t("equipmentTitle")}</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {equipment.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-ink-soft">
                  <Icon name="i-check" className="mt-0.5 h-4 w-4 shrink-0 text-spruce" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-ink">{t("participantsTitle")}</h2>
              {event.registrations.length > 0 && (
                <span className="text-sm text-ink-faint">{t("participantsCount", { count: event.registrations.length })}</span>
              )}
            </div>
            {event.registrations.length === 0 ? (
              <p className="mt-3 text-sm text-ink-faint">{t("participantsEmpty")}</p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-[var(--radius-m)] border border-border">
                <table className="w-full min-w-[420px] text-sm">
                  <tbody>
                    {event.registrations.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 font-semibold text-ink">{r.user.name}</td>
                        <td className="px-4 py-2.5 text-ink-soft">{r.distance.name}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-ink-faint">#{r.bibNumber ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-5">
          <div className="rounded-[var(--radius-l)] border border-border bg-surface p-5">
            <h3 className="font-display text-lg font-bold text-ink">{t("distancesTitle")}</h3>
            <div className="mt-3 flex flex-col gap-4">
              {disciplines.map((discipline) => (
                <div key={discipline}>
                  <div className="text-xs font-bold uppercase tracking-wide text-ember">{discipline}</div>
                  <div className="mt-2 flex flex-col gap-2">
                    {event.distances
                      .filter((d) => d.discipline === discipline)
                      .map((d) => (
                        <DistanceRow key={d.id} distance={d} />
                      ))}
                  </div>
                </div>
              ))}
              {noDisciplineDistances.length > 0 && (
                <div className="flex flex-col gap-2">
                  {noDisciplineDistances.map((d) => (
                    <DistanceRow key={d.id} distance={d} />
                  ))}
                </div>
              )}
            </div>
            {event.status === "OPEN" ? (
              <Link
                href={`/events/${event.race.slug}/${event.year}/register`}
                className="mt-5 flex w-full items-center justify-center rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
              >
                {t("registerCta")}
              </Link>
            ) : (
              <button
                disabled
                className="mt-5 w-full cursor-not-allowed rounded-[var(--radius-s)] bg-surface-2 px-5 py-3 text-sm font-bold text-ink-faint"
              >
                {t("registerCta")}
              </button>
            )}
          </div>

          <div className="rounded-[var(--radius-l)] border border-border bg-surface p-5">
            <h3 className="font-display text-lg font-bold text-ink">{t("keyDatesTitle")}</h3>
            <dl className="mt-3 flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-faint">{t("registrationDeadline")}</dt>
                <dd className="text-right font-semibold text-ink">
                  {format.dateTime(event.registrationDeadline, { day: "numeric", month: "long" })}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-faint">{t("cancellationDeadline")}</dt>
                <dd className="text-right font-semibold text-ink">
                  {format.dateTime(event.cancellationDeadline, { day: "numeric", month: "long" })}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-faint">{t("medicalDeadline")}</dt>
                <dd className="text-right font-semibold text-ink">
                  {format.dateTime(event.medicalCancellationDeadline, { day: "numeric", month: "long" })}
                </dd>
              </div>
            </dl>
          </div>

          {event.transferPrice && (
            <div className="rounded-[var(--radius-l)] border border-border bg-surface p-5">
              <h3 className="font-display text-lg font-bold text-ink">{t("transferTitle")}</h3>
              <p className="mt-2 text-sm text-ink-soft">
                {t("transferText", { price: formatKzt(format, event.transferPrice) })}
              </p>
            </div>
          )}

          {event.resultsUrl && (
            <a
              href={event.resultsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[var(--radius-l)] border border-border bg-surface p-5 transition-colors hover:bg-surface-2"
            >
              <h3 className="font-display text-lg font-bold text-ink">{t("resultsTitle")}</h3>
              <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-ember">
                {t("resultsCta")}
                <Icon name="i-arrow" className="h-4 w-4" />
              </span>
            </a>
          )}
        </aside>
      </div>
    </main>
  );
}

function DistanceRow({ distance }: { distance: Distance }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-s)] bg-surface-2 px-3 py-2.5">
      <DistanceInfo
        name={distance.name}
        km={distance.km}
        price={distance.price}
        minAge={distance.minAge}
        maxAge={distance.maxAge}
      />
    </div>
  );
}
