import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";

export default async function ClubsListPage() {
  const adminId = await requireAdminId();
  if (!adminId) redirect({ href: "/", locale: await getLocale() });

  const [t, clubs] = await Promise.all([
    getTranslations("Admin"),
    prisma.runningClub.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { registrations: true } } },
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

      {clubs.length === 0 ? (
        <p className="text-sm text-ink-faint">{t("runningClubsEmpty")}</p>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-m)] border border-border">
          {clubs.map((c) => (
            <div key={c.id} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
              <div className="flex-1">
                <span className="font-semibold text-ink">{c.name}</span>
                {c.city && <span className="ml-2 text-sm text-ink-faint">{c.city}</span>}
              </div>
              <span className="text-xs text-ink-faint">{c._count.registrations} рег.</span>
              <Link href={`/admin/clubs/${c.id}`} className="text-sm font-semibold text-ink-soft hover:text-ink">
                {t("editCta")}
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
