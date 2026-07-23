import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { ClubRequestsSection } from "./ClubRequestsSection";

export default async function ClubsListPage() {
  const adminId = await requireAdminId();
  if (!adminId) redirect({ href: "/", locale: await getLocale() });

  const [t, clubs, pendingRequests] = await Promise.all([
    getTranslations("Admin"),
    prisma.runningClub.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { memberUsers: true } } },
    }),
    prisma.clubMembershipRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        clubName: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="mb-2 block text-sm font-semibold text-ink-faint hover:text-ink">
            ← {t("backToAdminCta")}
          </Link>
          <h1 className="font-display text-2xl font-bold text-ink">{t("runningClubsTitle")}</h1>
        </div>
        <Link
          href="/admin/clubs/new"
          className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
        >
          {t("createClubCta")}
        </Link>
      </div>

      <ClubRequestsSection requests={pendingRequests} />

      {clubs.length === 0 ? (
        <p className="text-sm text-ink-faint">{t("runningClubsEmpty")}</p>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-m)] border border-border">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-border bg-surface-2 px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-widest text-ink-faint">Клуб</span>
            <span className="text-xs font-bold uppercase tracking-widest text-ink-faint">Бегунов</span>
            <span className="w-12" />
          </div>
          {clubs.map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border px-4 py-3 last:border-0">
              <div>
                <span className="font-semibold text-ink">{c.name}</span>
                {c.city && <span className="ml-2 text-sm text-ink-faint">{c.city}</span>}
              </div>
              <span className="min-w-[4rem] text-right font-variant-numeric text-sm font-semibold text-ink tabular-nums">
                {c._count.memberUsers}
              </span>
              <Link href={`/admin/clubs/${c.id}`} className="w-12 text-right text-sm font-semibold text-ink-soft hover:text-ink">
                {t("editCta")}
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
