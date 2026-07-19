import { requireAdminPage } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { RaceForm } from "../RaceForm";
import { createRaceAction } from "../actions";

export default async function NewRacePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/races/new");
  const t = await getTranslations("Admin");

  const action = createRaceAction.bind(null, locale);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <Link href="/admin/races" className="text-sm font-semibold text-ink-faint transition-colors hover:text-ink">
          ← {t("racesTitle")}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">{t("newRaceTitle")}</h1>
      </div>
      <RaceForm mode="create" action={action} />
    </main>
  );
}
