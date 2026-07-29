import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/session";
import { getRaceForAdmin } from "@/lib/queries";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { RaceForm } from "../RaceForm";
import { updateRaceAction } from "../actions";

export default async function EditRacePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requireAdminPage(locale, `/admin/races/${id}`);

  const [race, t] = await Promise.all([getRaceForAdmin(id), getTranslations("Admin")]);
  if (!race) notFound();

  const action = updateRaceAction.bind(null, id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <Link href="/admin/races" className="text-sm font-semibold text-ink-faint transition-colors hover:text-ink">
          ← {t("racesTitle")}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">{race.name}</h1>
      </div>
      <RaceForm
        mode="edit"
        action={action}
        defaults={{
          name: race.name,
          slug: race.slug,
          courseIntro: race.courseIntro,
          icon: race.icon,
          color: race.color,
          isChallenge: race.isChallenge,
        }}
      />
    </main>
  );
}
