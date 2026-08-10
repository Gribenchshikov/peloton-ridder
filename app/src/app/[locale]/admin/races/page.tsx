import { requireAdminPage } from "@/lib/session";
import { getRacesListForAdmin } from "@/lib/queries";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/IconSprite";

export default async function RacesAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/races");

  const [races, t] = await Promise.all([getRacesListForAdmin(), getTranslations("Admin")]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-ink-faint transition-colors hover:text-ink">
            ← {t("backToAdminCta")}
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink">{t("racesTitle")}</h1>
        </div>
        <Link
          href="/admin/races/new"
          className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
        >
          {t("createRaceCta")}
        </Link>
      </div>

      {races.length === 0 ? (
        <p className="text-sm text-ink-faint">{t("racesEmpty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-m)] border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("fieldName")}</th>
                <th className="px-4 py-2.5 text-left font-mono font-semibold text-ink-soft">Slug</th>
                <th className="px-4 py-2.5 text-center font-semibold text-ink-soft">Событий</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {races.map((race) => (
                <tr key={race.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-2.5">
                    <Icon name={race.icon} className="mr-2 inline-block h-4 w-4" />
                    <span className="font-semibold text-ink">{race.name}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">{race.slug}</td>
                  <td className="px-4 py-2.5 text-center tabular-nums text-ink-soft">
                    {race._count.events}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/admin/races/${race.id}`} className="font-semibold text-ink hover:text-ember">
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
