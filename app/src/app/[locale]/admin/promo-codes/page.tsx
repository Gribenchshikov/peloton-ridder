import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";

export default async function PromoCodesPage() {
  const adminId = await requireAdminId();
  if (!adminId) redirect({ href: "/", locale: await getLocale() });

  const [t, promos] = await Promise.all([
    getTranslations("Admin"),
    prisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { event: { select: { year: true, race: { select: { name: true } } } } },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="mb-2 block text-sm font-semibold text-ink-faint hover:text-ink">
            ← {t("backToAdminCta")}
          </Link>
          <h1 className="font-display text-2xl font-bold text-ink">{t("promoCodesTitle")}</h1>
        </div>
        <Link
          href="/admin/promo-codes/new"
          className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
        >
          {t("createPromoCta")}
        </Link>
      </div>

      {promos.length === 0 ? (
        <p className="text-sm text-ink-faint">{t("promoCodesEmpty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-m)] border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-3">Код</th>
                <th className="px-4 py-3">Скидка</th>
                <th className="px-4 py-3">Забег</th>
                <th className="px-4 py-3">Использовано</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono font-semibold text-ink">{p.code}</td>
                  <td className="px-4 py-3 text-ink">
                    {p.discountType === "PERCENT"
                      ? `${p.discountValue}%`
                      : `${p.discountValue.toLocaleString("ru-KZ")} ₸`}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {p.event ? `${p.event.race.name} ${p.event.year}` : "Все забеги"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {p.usedCount}{p.maxUses ? ` / ${p.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${p.active ? "bg-spruce/15 text-spruce" : "bg-surface-2 text-ink-faint"}`}>
                      {p.active ? "Активен" : "Отключён"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/promo-codes/${p.id}`} className="font-semibold text-ink-soft hover:text-ink">
                      {t("editCta")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
