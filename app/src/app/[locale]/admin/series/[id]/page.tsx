import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { SeriesForm } from "../SeriesForm";
import { DeleteSeriesButton } from "./DeleteSeriesButton";

export default async function EditSeriesPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  await requireAdminPage(locale, `/admin/series/${id}`);

  const [t, series, allRaces] = await Promise.all([
    getTranslations("Admin"),
    prisma.series.findUnique({
      where: { id },
      include: { seriesRaces: { orderBy: { stageOrder: "asc" } } },
    }),
    prisma.race.findMany({ where: { isMass: false }, orderBy: { name: "asc" } }),
  ]);
  if (!series) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/series" className="mb-2 block text-sm font-semibold text-ink-faint hover:text-ink">
            ← {t("backToSeriesCta")}
          </Link>
          <h1 className="font-display text-2xl font-bold text-ink">{series.name}</h1>
        </div>
        <DeleteSeriesButton seriesId={id} locale={locale} label={t("deleteCta")} />
      </div>

      <SeriesForm
        mode="edit"
        locale={locale}
        seriesId={id}
        allRaces={allRaces}
        defaults={{
          name: series.name,
          description: series.description,
          seriesRaces: series.seriesRaces,
        }}
      />
    </main>
  );
}
