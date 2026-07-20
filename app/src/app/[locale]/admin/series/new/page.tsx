import { requireAdminPage } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { SeriesForm } from "../SeriesForm";

export default async function NewSeriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/series/new");

  const [t, allRaces] = await Promise.all([
    getTranslations("Admin"),
    prisma.race.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="mb-8">
        <Link href="/admin/series" className="mb-2 block text-sm font-semibold text-ink-faint hover:text-ink">
          ← {t("backToSeriesCta")}
        </Link>
        <h1 className="font-display text-2xl font-bold text-ink">{t("newSeriesTitle")}</h1>
      </div>

      <SeriesForm mode="create" locale={locale} allRaces={allRaces} />
    </main>
  );
}
