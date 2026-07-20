import { requireAdminPage } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { PromoForm } from "../PromoForm";

export default async function NewPromoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/promo-codes/new");

  const [t, events] = await Promise.all([
    getTranslations("Admin"),
    prisma.event.findMany({ orderBy: { dateISO: "desc" }, select: { id: true, year: true, race: { select: { name: true } } } }),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="mb-8">
        <Link href="/admin/promo-codes" className="mb-2 block text-sm font-semibold text-ink-faint hover:text-ink">
          ← {t("backToPromosCta")}
        </Link>
        <h1 className="font-display text-2xl font-bold text-ink">{t("newPromoTitle")}</h1>
      </div>
      <PromoForm mode="create" locale={locale} events={events} />
    </main>
  );
}
