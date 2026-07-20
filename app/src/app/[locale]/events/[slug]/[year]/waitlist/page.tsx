import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getEventForRegistration } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { WaitlistForm } from "./WaitlistForm";

export default async function WaitlistPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string; year: string }>;
  searchParams: Promise<{ distanceId?: string }>;
}) {
  const { locale, slug, year } = await params;
  const { distanceId: preselectedDistanceId } = await searchParams;

  const [session, event] = await Promise.all([auth(), getEventForRegistration(slug, Number(year))]);

  if (!session?.user?.id) {
    return redirect({ href: { pathname: "/login", query: { callbackUrl: `/events/${slug}/${year}/waitlist` } }, locale });
  }
  if (!event) notFound();
  if (event.status !== "OPEN") return redirect({ href: `/events/${slug}/${year}`, locale });

  const now = new Date();
  const slotCounts = await prisma.registration.groupBy({
    by: ["distanceId"],
    where: { eventId: event.id, OR: [{ status: "PAID" }, { status: "RESERVED", reservedUntil: { gt: now } }] },
    _count: { id: true },
  });
  const slotCountMap = Object.fromEntries(slotCounts.map((s) => [s.distanceId, s._count.id]));

  const fullDistances = event.distances.filter((d) => {
    const bibCapacity = d.bibRangeEnd - d.bibRangeStart + 1;
    const capacity = d.maxSlots !== null ? Math.min(d.maxSlots, bibCapacity) : bibCapacity;
    return (slotCountMap[d.id] ?? 0) >= capacity;
  });

  if (fullDistances.length === 0) {
    return redirect({ href: `/events/${slug}/${year}/register`, locale });
  }

  const alreadyOnList = await prisma.waitlist.findMany({
    where: { userId: session.user.id, eventId: event.id },
    select: { distanceId: true },
  });
  const onListDistanceIds = new Set(alreadyOnList.map((w) => w.distanceId));
  const availableDistances = fullDistances.filter((d) => !onListDistanceIds.has(d.id));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <WaitlistHeader raceName={`${event.race.name} ${event.year}`} />
      {availableDistances.length === 0 ? (
        <AlreadyOnList />
      ) : (
        <WaitlistForm
          eventId={event.id}
          distances={availableDistances}
          preselectedDistanceId={preselectedDistanceId}
          locale={locale}
        />
      )}
    </main>
  );
}

function WaitlistHeader({ raceName }: { raceName: string }) {
  const t = useTranslations("Waitlist");
  return (
    <div>
      <span className="text-xs font-bold uppercase tracking-wide text-ember">{raceName}</span>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-2 text-sm text-ink-soft">{t("subtitle")}</p>
    </div>
  );
}

function AlreadyOnList() {
  const t = useTranslations("Waitlist");
  return (
    <div className="rounded-[var(--radius-m)] border border-border bg-surface p-6 text-sm text-ink-soft">
      {t("alreadyOnList")}
    </div>
  );
}
