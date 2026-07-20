import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { PromoForm } from "../PromoForm";
import { DeletePromoButton } from "./DeletePromoButton";

export default async function EditPromoPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  await requireAdminPage(locale, `/admin/promo-codes/${id}`);

  const [t, promo, events] = await Promise.all([
    getTranslations("Admin"),
    prisma.promoCode.findUnique({ where: { id } }),
    prisma.event.findMany({ orderBy: { dateISO: "desc" }, select: { id: true, year: true, race: { select: { name: true } } } }),
  ]);
  if (!promo) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/promo-codes" className="mb-2 block text-sm font-semibold text-ink-faint hover:text-ink">
            ← {t("backToPromosCta")}
          </Link>
          <h1 className="font-mono text-2xl font-bold text-ink">{promo.code}</h1>
          <p className="mt-1 text-sm text-ink-faint">Использовано: {promo.usedCount}{promo.maxUses ? ` из ${promo.maxUses}` : ""}</p>
        </div>
        <DeletePromoButton promoId={id} locale={locale} label={t("deleteCta")} />
      </div>

      <PromoForm
        mode="edit"
        locale={locale}
        promoId={id}
        events={events}
        defaults={{
          code: promo.code,
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          maxUses: promo.maxUses,
          expiresAt: promo.expiresAt,
          eventId: promo.eventId,
          active: promo.active,
        }}
      />
    </main>
  );
}
