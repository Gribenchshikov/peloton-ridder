import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/IconSprite";
import { Countdown } from "@/components/Countdown";
import { EventCard } from "@/components/EventCard";
import { getHomeEvents, getNextEvent, getSeriesWithRaces, getSiteSetting } from "@/lib/queries";

export default async function Home() {
  const [events, nextEvent, series, heroBgUrl, homeStatsRaw] = await Promise.all([
    getHomeEvents(),
    getNextEvent(),
    getSeriesWithRaces(),
    getSiteSetting("hero_bg_url"),
    getSiteSetting("home_stats"),
  ]);

  let customStats: { value: string; label: string }[] | null = null;
  try { if (homeStatsRaw) customStats = JSON.parse(homeStatsRaw); } catch { /* ignore */ }

  return (
    <main className="flex flex-1 flex-col">
      <Hero nextEvent={nextEvent} heroBgUrl={heroBgUrl} />
      <StatsStrip customStats={customStats} />
      <EventsSection events={events} />
      {series && <SeriesSection series={series} />}
      <VolunteerSection />
    </main>
  );
}

function Hero({
  nextEvent,
  heroBgUrl,
}: {
  nextEvent: Awaited<ReturnType<typeof getNextEvent>>;
  heroBgUrl: string | null;
}) {
  const t = useTranslations("Home");
  const format = useFormatter();

  const heroStyle = heroBgUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(12,16,11,.0) 0%, rgba(12,16,11,.18) 55%, rgba(12,16,11,.72) 100%), url(${heroBgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        background:
          "linear-gradient(180deg, rgba(12,16,11,.0) 0%, rgba(12,16,11,.18) 55%, rgba(12,16,11,.72) 100%), var(--stone-900, #0e1410)",
      };

  return (
    <section
      className="relative flex min-h-[560px] items-end overflow-hidden border-b border-border pb-16 pt-[120px]"
      style={heroStyle}
    >
      {/* subtle mountain silhouette gradient */}
      {!heroBgUrl && (
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 60% 110%, rgba(42,64,38,.55) 0%, transparent 70%), #0f1610",
          }}
        />
      )}

      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 px-6 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
        {/* Left: headline */}
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-dawn">
            <span className="h-1.5 w-1.5 rounded-full bg-dawn" />
            {t("eyebrow")}
          </span>
          <h1
            className="mt-4 font-display font-extrabold leading-[.97] text-[#FBF8F1]"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4.6rem)" }}
          >
            {t("titlePart1")}
            <br />
            {t("titlePart2")}{" "}
            <span style={{ color: "var(--dawn)" }}>{t("titleEmphasis")}</span>.
          </h1>
          <p className="mt-5 max-w-[46ch] text-[1.05rem] leading-relaxed text-[rgba(251,248,241,.80)]">
            {t("lead")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/about"
              className="rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
            >
              {t("joinCta")}
            </Link>
            <Link
              href="/events"
              className="flex items-center gap-2 rounded-[var(--radius-s)] border border-[rgba(251,248,241,.38)] bg-[rgba(251,248,241,.08)] px-5 py-3 text-sm font-bold text-[#FBF8F1] backdrop-blur-sm transition-colors hover:border-[rgba(251,248,241,.7)]"
            >
              {t("allEventsCta")}
              <Icon name="i-arrow" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Right: next race card — glass */}
        {nextEvent && (
          <div
            className="relative overflow-hidden rounded-[var(--radius-l)] p-6 shadow-[0_20px_44px_-20px_rgba(0,0,0,.6)]"
            style={{
              background: "rgba(27,33,24,.5)",
              backdropFilter: "blur(14px)",
              border: "1px solid rgba(251,248,241,.18)",
            }}
          >
            {/* Top gradient bar */}
            <div
              className="absolute left-0 right-0 top-0 h-[5px]"
              style={{ background: "linear-gradient(90deg, var(--ember), var(--dawn))" }}
            />
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-dawn">
              <span className="h-1.5 w-1.5 rounded-full bg-dawn" />
              {t("nextRaceEyebrow")}
            </span>
            <div className="mt-3 font-display text-2xl font-extrabold text-[#FBF8F1]">
              {nextEvent.race.name}
            </div>
            <div className="mt-3 flex flex-col gap-1.5 text-sm text-[rgba(251,248,241,.75)]">
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
              <Countdown targetISO={nextEvent.dateISO.toISOString()} dark />
            </div>
            <Link
              href={`/events/${nextEvent.race.slug}/${nextEvent.year}`}
              className="mt-4 block rounded-[var(--radius-s)] bg-spruce px-5 py-3 text-center text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              {t("viewRaceCta")}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function StatsStrip({ customStats }: { customStats: { value: string; label: string }[] | null }) {
  const t = useTranslations("Home");
  const fallback = [
    { value: t("stat1Value"), label: t("stat1Label") },
    { value: t("stat2Value"), label: t("stat2Label") },
    { value: t("stat3Value"), label: t("stat3Label") },
    { value: t("stat4Value"), label: t("stat4Label") },
  ];
  const stats = customStats && customStats.length === 4 ? customStats : fallback;
  return (
    <div className="mx-auto w-full max-w-6xl px-6">
      <div className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-m)] border border-border lg:grid-cols-4" style={{ gap: "1px", background: "var(--border)" }}>
        {stats.map(({ value, label }) => (
          <div key={label} className="bg-surface px-5 py-6 text-center">
            <b className="block font-display text-3xl font-extrabold text-spruce">{value}</b>
            <span className="mt-1 block text-xs text-ink-soft">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventsSection({ events }: { events: Awaited<ReturnType<typeof getHomeEvents>> }) {
  const t = useTranslations("Home");
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ember">
              <span className="h-1.5 w-1.5 rounded-full bg-ember" />
              {t("calendarEyebrow")}
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-[clamp(1.7rem,3vw,2.3rem)]">
              {t("calendarTitle")}
            </h2>
          </div>
          <Link
            href="/events"
            className="flex items-center gap-2 text-sm font-semibold text-ink-faint transition-colors hover:text-ink"
          >
            {t("calendarAllLink")}
            <Icon name="i-arrow" className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="mx-auto max-w-6xl">
      <div
        className="relative overflow-hidden rounded-[var(--radius-l)] px-10 py-14 sm:px-14"
        style={{
          background: "linear-gradient(100deg, rgba(20,38,22,.95) 0%, rgba(20,38,22,.80) 42%, rgba(20,38,22,.45) 100%), var(--spruce)",
        }}
      >
        <div className="relative z-10 max-w-[52ch]">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ember">
            <span className="h-1.5 w-1.5 rounded-full bg-ember" />
            {t("seriesEyebrow")}
          </span>
          <h2 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">{t("seriesTitle")}</h2>
          <p className="mt-3 text-[rgba(203,214,204,.85)]">{t("seriesText", { races: raceNames })}</p>
          <Link href="/series" className="mt-6 inline-block rounded-[var(--radius-s)] bg-white px-5 py-3 text-sm font-bold text-spruce transition-opacity hover:opacity-90">
            {t("seriesCta")}
          </Link>
        </div>
      </div>
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
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ember">
            <span className="h-1.5 w-1.5 rounded-full bg-ember" />
            {t("volunteerEyebrow")}
          </span>
          <h2 className="mt-2 font-display text-xl font-bold text-ink">{t("volunteerTitle")}</h2>
          <p className="mt-2 max-w-lg text-sm text-ink-soft">{t("volunteerText")}</p>
        </div>
        <Link
          href="/volunteer/apply"
          className="shrink-0 rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
        >
          {t("volunteerCta")}
        </Link>
      </div>
    </section>
  );
}
