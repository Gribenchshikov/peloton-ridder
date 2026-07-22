import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";

export default async function ClubsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Clubs" });

  const clubs = await prisma.runningClub.findMany({
    select: {
      id: true,
      name: true,
      city: true,
      _count: {
        select: {
          registrations: { where: { status: "PAID" } },
          memberUsers: true,
        },
      },
    },
    orderBy: { registrations: { _count: "desc" } },
  });

  // Also count unique events each club has participated in
  const clubEventCounts = await prisma.registration.groupBy({
    by: ["runningClubId", "eventId"],
    where: { status: "PAID", runningClubId: { not: null } },
    _count: { id: true },
  });
  const eventsByClub = new Map<string, Set<string>>();
  for (const row of clubEventCounts) {
    if (!row.runningClubId) continue;
    if (!eventsByClub.has(row.runningClubId)) eventsByClub.set(row.runningClubId, new Set());
    eventsByClub.get(row.runningClubId)!.add(row.eventId);
  }

  const ranked = clubs
    .filter((c) => c._count.registrations > 0)
    .map((c, i) => ({ ...c, rank: i + 1, eventsCount: eventsByClub.get(c.id)?.size ?? 0 }));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <div>
        <span className="text-xs font-bold uppercase tracking-wide text-ember">Ridder Race Series</span>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-ink">{t("title")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t("subtitle")}</p>
      </div>

      {ranked.length === 0 ? (
        <p className="text-sm text-ink-faint">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-m)] border border-border">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3 text-left w-10">#</th>
                <th className="px-4 py-3 text-left">{t("colClub")}</th>
                <th className="px-4 py-3 text-right">{t("colParticipants")}</th>
                <th className="px-4 py-3 text-right">{t("colEvents")}</th>
                <th className="px-4 py-3 text-right">{t("colMembers")}</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((club) => (
                <tr key={club.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-3 tabular-nums font-bold text-ink-faint">
                    {club.rank <= 3 ? (["🥇", "🥈", "🥉"][club.rank - 1]) : club.rank}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{club.name}</p>
                    {club.city && <p className="text-xs text-ink-faint">{club.city}</p>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-ink">
                    {club._count.registrations}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                    {club.eventsCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                    {club._count.memberUsers}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-[var(--radius-m)] border border-dashed border-border p-5 text-center">
        <p className="text-sm text-ink-soft">{t("joinPrompt")}</p>
        <Link
          href="/account"
          className="mt-3 inline-block rounded-[var(--radius-s)] bg-ember px-5 py-2.5 text-sm font-bold text-white hover:bg-ember-strong"
        >
          {t("joinCta")}
        </Link>
      </div>
    </main>
  );
}
