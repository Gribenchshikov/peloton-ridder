import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { getEventForRegistration, getActiveRegistration, getUserContactInfo } from "@/lib/queries";
import { ensureMassAttendanceDistance } from "@/lib/massAttendance";
import { capacityTakenWhere } from "@/lib/slotOccupancy";
import { parseSizeTable } from "@/types/sizeTable";
import { prisma } from "@/lib/prisma";
import { RegisterView } from "./RegisterView";
import { ContactOrganizerButton } from "./ContactOrganizerButton";
import { BuyTransferButton } from "./BuyTransferButton";

export default async function EventRegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string; year: string }>;
  searchParams: Promise<{ fromPay?: string }>;
}) {
  const { locale, slug, year } = await params;
  const { fromPay } = await searchParams;

  const [session, initialEvent] = await Promise.all([auth(), getEventForRegistration(slug, Number(year))]);

  if (!initialEvent) notFound();
  if (initialEvent.race.isMass) {
    await ensureMassAttendanceDistance(initialEvent.id);
  }
  const event = initialEvent.race.isMass
    ? (await getEventForRegistration(slug, Number(year))) ?? initialEvent
    : initialEvent;

  if (!session?.user?.id) {
    return redirect({
      href: { pathname: "/login", query: { callbackUrl: `/events/${slug}/${year}/register` } },
      locale,
    });
  }

  if (event.status !== "OPEN") {
    return redirect({ href: `/events/${slug}/${year}`, locale });
  }

  const now = new Date();
  const [existing, profile, clubs, sizeTableSetting, slotCounts] = await Promise.all([
    getActiveRegistration(session.user.id, event.id),
    getUserContactInfo(session.user.id),
    prisma.runningClub.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, city: true } }),
    prisma.siteSetting.findUnique({ where: { key: "tshirt_size_table" } }),
    prisma.registration.groupBy({
      by: ["distanceId"],
      where: {
        eventId: event.id,
        isTransferOnly: false,
        ...capacityTakenWhere(event.race.isMass, now),
      },
      _count: { id: true },
    }),
  ]);

  const sizeTableRows = parseSizeTable(sizeTableSetting?.value);
  const slotCountMap = Object.fromEntries(slotCounts.map((s) => [s.distanceId, s._count.id]));
  const distancesWithSlots = event.distances.map((d) => {
    const bibCapacity = (d.bibRangeStart !== null && d.bibRangeEnd !== null) ? d.bibRangeEnd - d.bibRangeStart + 1 : null;
    const capacity = bibCapacity !== null
      ? (d.maxSlots !== null ? Math.min(d.maxSlots, bibCapacity) : bibCapacity)
      : (d.maxSlots ?? Number.MAX_SAFE_INTEGER);
    const taken = slotCountMap[d.id] ?? 0;
    return { ...d, capacity, taken };
  });
  if (existing) {
    if (existing.status === "PAID" || event.race.isMass) {
      const alreadyHasTransfer = Boolean(
        existing.includesTransfer ||
          (await prisma.registration.findFirst({
            where: {
              userId: session.user.id,
              eventId: event.id,
              isTransferOnly: true,
              status: "PAID",
            },
            select: { id: true },
          })),
      );
      return (
        <AlreadyRegistered
          event={event}
          registration={existing}
          locale={locale}
          alreadyHasTransfer={alreadyHasTransfer}
        />
      );
    }
    if (!fromPay) {
      return redirect({ href: `/pay/${existing.id}`, locale });
    }
  }
  if (!profile) {
    return redirect({ href: "/login", locale });
  }
  if (!profile.emailVerified) {
    return <EmailConfirmationRequired email={profile.email} />;
  }

  return <RegisterView event={{ ...event, distances: distancesWithSlots }} profile={profile} locale={locale} clubs={clubs} callbackPath={`/events/${slug}/${year}/register`} sizeTableRows={sizeTableRows} hasBirthDate={!!profile.birthDate} defaultTshirtSize={profile.tshirtSize} defaultClubId={profile.runningClubId} defaultIncludesTransfer={Boolean(fromPay && existing?.includesTransfer)} isChallenge={event.race.isChallenge} isMass={event.race.isMass} hasStrava={!!profile.stravaAthleteId} />;
}

type ActiveReg = NonNullable<Awaited<ReturnType<typeof getActiveRegistration>>>;

function AlreadyRegistered({
  event,
  registration,
  locale,
  alreadyHasTransfer,
}: {
  event: NonNullable<Awaited<ReturnType<typeof getEventForRegistration>>>;
  registration: ActiveReg;
  locale: string;
  alreadyHasTransfer: boolean;
}) {
  const t = useTranslations("Registration");
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <section className="rounded-[var(--radius-m)] border border-border bg-surface p-6">
        <span className="text-xs font-bold uppercase tracking-wide text-spruce">{t("eyebrow")}</span>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">
          {t("alreadyRegisteredTitle")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          {t("alreadyRegisteredText", { race: `${event.race.name} ${event.year}` })}
        </p>
        <p className="mt-1 text-sm text-ink-faint">{t("contactOrganizerNote")}</p>
        <div className="mt-4 rounded-[var(--radius-s)] border border-border bg-surface-2 px-4 py-3">
          <p className="text-xs text-ink-faint">
            {registration.distance ? `${registration.distance.name}${registration.distance.km > 0 ? ` · ${registration.distance.km} км` : ""}` : "Трансфер"}
          </p>
          {registration.bibNumber && (
            <p className="mt-1 font-display text-3xl font-bold text-ink">
              #{registration.bibNumber}
            </p>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/tickets/${registration.id}`}
            className="rounded-[var(--radius-s)] bg-ember px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            {t("showQrCta")}
          </Link>
          <Link
            href={`/events/${event.race.slug}/${event.year}`}
            className="rounded-[var(--radius-s)] border border-border px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-2"
          >
            {t("backToEventCta")}
          </Link>
          <ContactOrganizerButton eventId={event.id} />
        </div>
        {event.transferPrice && event.location && !event.race.isMass && (
          <BuyTransferButton
            registrationId={registration.id}
            price={event.transferPrice}
            location={event.location}
            locale={locale}
            alreadyHasTransfer={alreadyHasTransfer}
          />
        )}
      </section>
    </main>
  );
}

function EmailConfirmationRequired({ email }: { email: string }) {
  const t = useTranslations("Registration");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <section className="rounded-[var(--radius-m)] border border-warn bg-warn-tint p-6">
        <span className="text-xs font-bold uppercase tracking-wide text-warn">{t("eyebrow")}</span>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">{t("emailVerificationTitle")}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ink-soft">{t("emailVerificationText", { email })}</p>
      </section>
    </main>
  );
}
