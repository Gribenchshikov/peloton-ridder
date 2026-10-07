import { notFound } from "next/navigation";
import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/IconSprite";
import { getEventDetail } from "@/lib/queries";
import { publicAssetUrl } from "@/lib/publicAssetUrl";
import { groupDistancesByDiscipline, heroDistanceStats } from "@/lib/distanceLabel";
import { formatKzt } from "@/lib/currency";
import { DistanceInfo } from "@/components/DistanceInfo";
import { DetailTabs, type DistanceWithProfile } from "./DetailTabs";
import { ChallengeLeaderboard } from "./ChallengeLeaderboard";
import { getChallengeLeaderboard } from "@/lib/queries";
import type { Distance } from "@/generated/prisma/client";
import type { ProfileData } from "@/lib/gpxParser";
import type { AidStation } from "@/types/aidStation";
import type { RegulationFile, RegulationBlock } from "@/types/regulation";
import type { PhotoLink, DayProgramItem, DistanceEquipment } from "@/types/eventContent";

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-white/20 text-white backdrop-blur-sm",
  DRAFT: "bg-white/15 text-white/70 backdrop-blur-sm",
  CLOSED: "bg-white/15 text-white/70 backdrop-blur-sm",
  COMPLETED: "bg-white/15 text-white/70 backdrop-blur-sm",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string; year: string }>;
}) {
  const { slug, year } = await params;
  const event = await getEventDetail(slug, Number(year));
  if (!event) notFound();

  const leaderboard = event.race.isChallenge ? await getChallengeLeaderboard(event.id) : null;

  return <EventDetailView event={event} leaderboard={leaderboard} />;
}

type LeaderboardRow = Awaited<ReturnType<typeof getChallengeLeaderboard>>[number];

function EventDetailView({ event, leaderboard }: { event: NonNullable<Awaited<ReturnType<typeof getEventDetail>>>; leaderboard: LeaderboardRow[] | null }) {
  const t = useTranslations("EventDetail");
  const tStatus = useTranslations("Status");
  const format = useFormatter();

  const regulationFiles = (event.regulationFiles as RegulationFile[] | null) ?? [];
  const regulationBlocks = (event.regulationBlocks as RegulationBlock[] | null) ?? [];
  const waiverFiles = (event.waiverFiles as RegulationFile[] | null) ?? [];
  const results = event.results ?? [];
  const photoLinks = (event.photoLinks as PhotoLink[] | null) ?? [];
  const eventPhotos = (event.eventPhotos as string[] | null) ?? [];
  const dayProgram = (event.dayProgram as DayProgramItem[] | null) ?? [];
  const distanceEquipment = (event.distanceEquipment as DistanceEquipment | null) ?? {};
  const { disciplines, noDiscipline: noDisciplineDistances } = groupDistancesByDiscipline(event.distances);
  const heroStats = heroDistanceStats(event.distances);
  const paidCount = event.registrations.length;
  const heroStatCount = heroStats.length + (paidCount > 0 ? 1 : 0);
  const isMass = event.race.isMass;

  const distancesWithProfile: DistanceWithProfile[] = event.distances
    .filter((d) => d.profileData != null)
    .map((d) => ({
      id: d.id,
      name: d.name,
      km: d.km,
      profileData: d.profileData as unknown as ProfileData,
      gpxUrl: d.gpxUrl ?? null,
      aidStations: (d.aidStations as AidStation[] | null) ?? [],
      raceStartMinutes: d.raceStartMinutes ?? null,
    }));

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        {/* Back link */}
        <Link
          href="/events"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-ink-faint transition-colors hover:text-ink"
        >
          <Icon name="i-arrow" className="h-4 w-4 rotate-180" />
          {t("backToEvents")}
        </Link>

        {/* Hero — rounded, inside container */}
        <div
          className="relative mb-8 flex min-h-[340px] flex-col justify-end overflow-hidden rounded-[var(--radius-l)] p-8 sm:p-10"
          style={{ backgroundColor: event.race.color }}
        >
          {event.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={publicAssetUrl(event.coverImageUrl) ?? event.coverImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[center_55%]"
            />
          )}
          {/* Gradient scrim */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(15,18,13,.1) 0%, rgba(15,18,13,.45) 60%, rgba(15,18,13,.85) 100%)",
            }}
          />

          {/* Content above scrim */}
          <div className="relative z-10 text-white">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide ${STATUS_STYLE[event.status]}`}
            >
              {tStatus(event.status)}
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight sm:text-4xl lg:text-[clamp(2rem,4.4vw,3.2rem)]">
              {event.race.name} {event.year}
            </h1>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/85">
              <span className="flex items-center gap-2">
                <Icon name="i-clock" className="h-4 w-4" />
                {format.dateTime(event.dateISO, { day: "numeric", month: "long", year: "numeric" })}
              </span>
              <span className="flex items-center gap-2 flex-wrap">
                <Icon name="i-pin" className="h-4 w-4 shrink-0" />
                {event.location}
                {event.locationUrl && (
                  <a
                    href={event.locationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-stone-800 shadow transition-colors hover:bg-white"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" aria-hidden>
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
                    </svg>
                    на карте
                  </a>
                )}
              </span>
            </div>

            {/* Stats strip */}
            {heroStats.length > 0 && (
              <div
                className="mt-5 grid gap-px overflow-hidden rounded-[var(--radius-m)] border border-white/20 backdrop-blur-md"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(Math.max(heroStatCount, 1), 4)}, 1fr)`,
                  background: "rgba(255,255,255,.14)",
                }}
              >
                {heroStats.map((stat) => (
                  <div key={stat.label} className="bg-black/25 px-4 py-3">
                    <span className="mb-1 block text-[.62rem] uppercase tracking-wide text-white/60">
                      {stat.label}
                    </span>
                    <b className="font-display text-[1.1rem] font-bold">
                      {stat.kmLabel}
                    </b>
                  </div>
                ))}
                {paidCount > 0 && (
                  <div className="bg-black/25 px-4 py-3">
                    <span className="mb-1 block text-[.62rem] uppercase tracking-wide text-white/60">
                      {t("participantsTitle")}
                    </span>
                    <b className="font-display text-[1.1rem] font-bold">{paidCount}</b>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content grid */}
        <div className={`grid gap-6 pb-16 lg:items-start lg:gap-8 ${isMass && event.eventPartners.length === 0 ? "" : "lg:grid-cols-[1fr_340px]"}`}>
          {/* LEFT: Tabs + Challenge Leaderboard */}
          <div className="flex min-w-0 flex-col gap-6">
            {leaderboard && event.challengeWindowEnd && (
              <ChallengeLeaderboard rows={leaderboard} windowEnd={event.challengeWindowEnd} />
            )}
            <DetailTabs
              courseIntro={event.race.courseIntro ?? ""}
              aboutText={event.aboutText ?? ""}
              photoLinks={photoLinks}
              eventPhotos={eventPhotos}
              dayProgram={dayProgram}
              howToGet={event.howToGet ?? ""}
              howToGetUrl={event.howToGetUrl}
              locationUrl={event.locationUrl}
              distanceEquipment={distanceEquipment}
              regulationFiles={regulationFiles}
              regulationBlocks={regulationBlocks}
              waiverFiles={waiverFiles}
              results={results}
              resultsUrl={event.resultsUrl}
              itraResultsUrl={event.itraResultsUrl}
              registrations={event.registrations}
              distances={distancesWithProfile}
              allDistances={event.distances.map((d) => ({ id: d.id, name: d.name, km: d.km }))}
              isMass={isMass}
            />
          </div>

          {/* RIGHT: sticky sidebar */}
          {(!isMass || event.eventPartners.length > 0) && (
          <aside className="flex flex-col gap-5 lg:sticky lg:top-24">
            {!isMass && (
              <>
            {/* 1. Distances + Register CTA */}
            <div className="rounded-[var(--radius-m)] border border-border bg-surface p-5">
              <h3 className="mb-4 font-display text-base font-bold text-ink">{t("distancesTitle")}</h3>
              <div className="flex flex-col gap-3">
                {disciplines.map((discipline) => (
                  <div key={discipline}>
                    <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ember">
                      {discipline}
                    </div>
                    <div className="flex flex-col gap-2">
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
                <>
                  <Link
                    href={`/events/${event.race.slug}/${event.year}/register`}
                    className="mt-5 flex w-full items-center justify-center rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
                  >
                    {t("registerCta")}
                  </Link>
                  <p className="mt-2 text-center text-[0.74rem] text-ink-faint">{t("paymentHint")}</p>
                </>
              ) : (
                <div className="mt-5 w-full rounded-[var(--radius-s)] bg-surface-2 px-5 py-3 text-center text-sm font-bold text-ink-faint">
                  {tStatus(event.status)}
                </div>
              )}
            </div>

            {/* 2. Transfer block */}
            {event.transferPrice != null && event.status === "OPEN" && (
              <div className="rounded-[var(--radius-m)] border border-border bg-surface p-5">
                <h3 className="mb-1 font-display text-base font-bold text-ink">{t("transferTitle")}</h3>
                <p className="text-sm text-ink-soft">
                  {event.location
                    ? t("transferRoute", { location: event.location })
                    : t("transferText", { price: formatKzt(format, event.transferPrice) })}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-ink">
                  {t("transferText", { price: formatKzt(format, event.transferPrice) })}
                </p>
                <Link
                  href={`/events/${event.race.slug}/${event.year}/transfer`}
                  className="mt-4 flex w-full items-center justify-center rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
                >
                  {t("transferOrder")}
                </Link>
              </div>
            )}

            {/* 3. Key dates */}
            <div className="rounded-[var(--radius-m)] border border-border bg-surface p-5">
              <h3 className="mb-4 font-display text-base font-bold text-ink">{t("keyDatesTitle")}</h3>
              <dl className="flex flex-col gap-3 text-sm">
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

            {/* 4. Volunteer block */}
            {event.status === "OPEN" && (
              <div className="rounded-[var(--radius-m)] border border-border bg-surface p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-bold text-ink">{t("volunteerCtaTitle")}</h3>
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-ink-faint">
                    {t("volunteerCtaBadge")}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-5 text-ink-soft">{t("volunteerCtaText")}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/volunteer/apply?eventId=${event.id}`}
                    className="rounded-[var(--radius-s)] bg-ember px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
                  >
                    {t("volunteerCtaApply")}
                  </Link>
                  <Link
                    href="/volunteer"
                    className="text-sm font-semibold text-ink-faint transition-colors hover:text-ink"
                  >
                    {t("volunteerCtaLearnMore")} →
                  </Link>
                </div>
              </div>
            )}

            {/* Results */}
            {(event.resultsUrl || event.itraResultsUrl) && (
              <div className="rounded-[var(--radius-m)] border border-border bg-surface p-5">
                <h3 className="font-display text-base font-bold text-ink">{t("resultsTitle")}</h3>
                <div className="mt-3 flex flex-col gap-2">
                  {event.resultsUrl && (
                    <a
                      href={event.resultsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-ember transition-colors hover:text-ember-strong"
                    >
                      {t("resultsExternalLink")}
                      <Icon name="i-arrow" className="h-4 w-4" />
                    </a>
                  )}
                  {event.itraResultsUrl && (
                    <a
                      href={event.itraResultsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-ember transition-colors hover:text-ember-strong"
                    >
                      {t("resultsItraLink")}
                      <Icon name="i-arrow" className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            )}
              </>
            )}

            {/* Partners */}
            {event.eventPartners.length > 0 && (
              <div className="rounded-[var(--radius-m)] border border-border bg-surface p-5">
                <h3 className="mb-4 font-display text-base font-bold text-ink">{t("partnersTitle")}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {event.eventPartners.map(({ partner }) => {
                    const inner = (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={publicAssetUrl(partner.logoUrl) ?? partner.logoUrl}
                          alt={partner.name}
                          className="h-10 w-full object-contain"
                        />
                        <span className="mt-2 block text-center text-[0.7rem] font-semibold leading-tight text-ink-soft">
                          {partner.name}
                        </span>
                      </>
                    );
                    return partner.websiteUrl ? (
                      <a
                        key={partner.id}
                        href={partner.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-3 transition-colors hover:border-[var(--ink-faint)] hover:bg-surface"
                      >
                        {inner}
                      </a>
                    ) : (
                      <div
                        key={partner.id}
                        className="flex flex-col items-center rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-3"
                      >
                        {inner}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
          )}
        </div>
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
        certification={distance.certification}
        certificationPoints={distance.certificationPoints}
      />
    </div>
  );
}
