import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";

export default async function SeriesListPage() {
  const adminId = await requireAdminId();
  if (!adminId) redirect({ href: "/", locale: await getLocale() });

  const [t, seriesList] = await Promise.all([
    getTranslations("Admin"),
    prisma.series.findMany({
      include: { seriesRaces: { include: { race: true }, orderBy: { stageOrder: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="mb-2 block text-sm font-semibold text-ink-faint hover:text-ink">
            ← {t("backToAdminCta")}
          </Link>
          <h1 className="font-display text-2xl font-bold text-ink">{t("seriesTitle")}</h1>
        </div>
        <Link
          href="/admin/series/new"
          className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
        >
          {t("createSeriesCta")}
        </Link>
      </div>

      {seriesList.length === 0 ? (
        <p className="text-sm text-ink-faint">{t("seriesEmpty")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {seriesList.map((s) => (
            <div key={s.id} className="flex items-start justify-between gap-4 rounded-[var(--radius-m)] border border-border bg-surface p-4 shadow-sm">
              <div>
                <p className="font-semibold text-ink">{s.name}</p>
                {s.description && <p className="mt-1 text-sm text-ink-soft">{s.description}</p>}
                <p className="mt-2 text-xs text-ink-faint">
                  {s.seriesRaces.map((sr) => sr.race.name).join(" · ")}
                </p>
              </div>
              <Link
                href={`/admin/series/${s.id}`}
                className="shrink-0 text-sm font-semibold text-ink-soft hover:text-ink"
              >
                {t("editCta")}
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
