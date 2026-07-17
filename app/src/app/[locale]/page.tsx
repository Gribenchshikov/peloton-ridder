import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/IconSprite";
import { Countdown } from "@/components/Countdown";
import { EventCard } from "@/components/EventCard";
import { getHomeEvents, getNextEvent, getSeriesWithRaces } from "@/lib/queries";

export default async function Home() {
  const [events, nextEvent, series] = await Promise.all([
    getHomeEvents(),
    getNextEvent(),
    getSeriesWithRaces(),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <Hero nextEvent={nextEvent} />
      <EventsSection events={events} />
      {series && <SeriesSection series={series} />}
      <VolunteerSection />
    </main>
  );
}

function Hero({ nextEvent }: { nextEvent: Awaited<ReturnType<typeof getNextEvent>> }) {
  const t = useTranslations("Home");
  const format = useFormatter();
  return (
    <section className="border-b border-border bg-surface px-6 py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ember">
            <span className="h-1.5 w-1.5 rounded-full bg-ember" />
            {t("eyebrow")}
          </span>
          <h1 className="mt-4 max-w-xl text-4xl font-extrabold leading-tight text-ink sm:text-5xl font-display">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-lg text-base text-ink-soft font-body">{t("lead")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong">
              {t("joinCta")}
            </button>
            <Link
              href="/events"
              className="flex items-center gap-2 rounded-[var(--radius-s)] border border-border px-5 py-3 text-sm font-bold text-ink transition-colors hover:bg-surface-2"
            >
              {t("allEventsCta")}
              <Icon name="i-arrow" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {nextEvent && (
          <div className="rounded-[var(--radius-l)] border border-border bg-stone-50 p-6 shadow-[var(--shadow)]">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-spruce">
              <span className="h-1.5 w-1.5 rounded-full bg-spruce" />
              {t("nextRaceEyebrow")}
            </span>
            <div className="mt-3 font-display text-2xl font-bold text-ink">{nextEvent.race.name}</div>
            <div className="mt-3 flex flex-col gap-1.5 text-sm text-ink-soft">
              <span className="flex items-center gap-2">
                <Icon name="i-clock" className="h-4 w-4" />
                {format.dateTime(nextEvent.dateISO, { day: "numeric", month: "long", year: "numeric" })}
              </span>
              <span className="flex items-center gap-2">
                <Icon name="i-pin" className="h-4 w-4" />
                {nextEvent.location}
              </span>
            </div>
            <div className="mt-5">
              <Countdown targetISO={nextEvent.dateISO.toISOString()} />
            </div>
            <Link
              href={`/events/${nextEvent.race.slug}/${nextEvent.year}`}
              className="mt-5 block rounded-[var(--radius-s)] bg-spruce px-5 py-3 text-center text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              {t("viewRaceCta")}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function EventsSection({ events }: { events: Awaited<ReturnType<typeof getHomeEvents>> }) {
  const t = useTranslations("Home");
  return (
    <section id="events" className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <span className="text-xs font-bold uppercase tracking-wide text-ember">{t("calendarEyebrow")}</span>
        <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">{t("calendarTitle")}</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SeriesSection({
  series,
}: {
  series: NonNullable<Awaited<ReturnType<typeof getSeriesWithRaces>>>;
}) {
  const t = useTranslations("Home");
  const raceNames = series.seriesRaces.map((sr) => sr.race.name).join(", ");

  return (
    <section className="px-6 pb-16">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[var(--radius-l)] bg-spruce px-8 py-12 text-white sm:px-12">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-dawn">
          <span className="h-1.5 w-1.5 rounded-full bg-dawn" />
          {t("seriesEyebrow")}
        </span>
        <h2 className="mt-3 max-w-xl font-display text-2xl font-bold sm:text-3xl">{t("seriesTitle")}</h2>
        <p className="mt-3 max-w-xl text-white/80">{t("seriesText", { races: raceNames })}</p>
        <button className="mt-6 rounded-[var(--radius-s)] bg-white px-5 py-3 text-sm font-bold text-spruce transition-opacity hover:opacity-90">
          {t("seriesCta")}
        </button>
      </div>
    </section>
  );
}

function VolunteerSection() {
  const t = useTranslations("Home");
  return (
    <section className="px-6 pb-16">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 rounded-[var(--radius-l)] border border-border bg-surface px-8 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-ember">{t("volunteerEyebrow")}</span>
          <h2 className="mt-2 font-display text-xl font-bold text-ink">{t("volunteerTitle")}</h2>
          <p className="mt-2 max-w-lg text-sm text-ink-soft">{t("volunteerText")}</p>
        </div>
        <button className="shrink-0 rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong">
          {t("volunteerCta")}
        </button>
      </div>
    </section>
  );
}
