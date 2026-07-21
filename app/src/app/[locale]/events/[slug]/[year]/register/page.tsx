import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { getEventForRegistration, getActiveRegistration, getUserContactInfo } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { RegisterView } from "./RegisterView";
import { ContactOrganizerButton } from "./ContactOrganizerButton";
import { BuyTransferButton } from "./BuyTransferButton";

export default async function EventRegisterPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; year: string }>;
}) {
  const { locale, slug, year } = await params;

  const [session, event] = await Promise.all([auth(), getEventForRegistration(slug, Number(year))]);

  if (!session?.user?.id) {
    return redirect({
      href: { pathname: "/login", query: { callbackUrl: `/events/${slug}/${year}/register` } },
      locale,
    });
  }
  if (!event) notFound();

  if (event.status !== "OPEN" || event.registrationDeadline < new Date()) {
    return redirect({ href: `/events/${slug}/${year}`, locale });
  }

  const now = new Date();
  const [existing, profile, clubs, tshirtGuide, slotCounts] = await Promise.all([
    getActiveRegistration(session.user.id, event.id),
    getUserContactInfo(session.user.id),
    prisma.runningClub.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, city: true } }),
    prisma.siteSetting.findUnique({ where: { key: "tshirt_size_guide_url" } }),
    prisma.registration.groupBy({
      by: ["distanceId"],
      where: {
        eventId: event.id,
        OR: [{ status: "PAID" }, { status: "RESERVED", reservedUntil: { gt: now } }],
      },
      _count: { id: true },
    }),
  ]);

  const slotCountMap = Object.fromEntries(slotCounts.map((s) => [s.distanceId, s._count.id]));
  const distancesWithSlots = event.distances.map((d) => {
    const bibCapacity = d.bibRangeEnd - d.bibRangeStart + 1;
    const capacity = d.maxSlots !== null ? Math.min(d.maxSlots, bibCapacity) : bibCapacity;
    const taken = slotCountMap[d.id] ?? 0;
    return { ...d, capacity, taken };
  });
  if (existing) {
    if (existing.status === "PAID") {
      return <AlreadyRegistered event={event} registration={existing} />;
    }
    return redirect({ href: `/pay/${existing.id}`, locale });
  }
  if (!profile) {
    return redirect({ href: "/login", locale });
  }
  if (!profile.emailVerified) {
    return <EmailConfirmationRequired email={profile.email} />;
  }

  return <RegisterView event={{ ...event, distances: distancesWithSlots }} profile={profile} locale={locale} clubs={clubs} callbackPath={`/events/${slug}/${year}/register`} tshirtSizeGuideUrl={tshirtGuide?.value} hasBirthDate={!!profile.birthDate} defaultTshirtSize={profile.tshirtSize} />;
}

type ActiveReg = NonNullable<Awaited<ReturnType<typeof getActiveRegistration>>>;

function AlreadyRegistered({
  event,
  registration,
}: {
  event: NonNullable<Awaited<ReturnType<typeof getEventForRegistration>>>;
  registration: ActiveReg;
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
          <p className="text-xs text-ink-faint">{registration.distance.name} · {registration.distance.km} км</p>
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
        {!registration.includesTransfer && event.transferPrice && event.location && (
          <BuyTransferButton
            registrationId={registration.id}
            price={event.transferPrice}
            location={event.location}
          />
        )}
        {registration.includesTransfer && (
          <div className="mt-4 rounded-[var(--radius-s)] border border-spruce/30 bg-spruce/5 px-4 py-3 text-sm font-semibold text-spruce">
            ✓ {t("transferIncluded")}
          </div>
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
