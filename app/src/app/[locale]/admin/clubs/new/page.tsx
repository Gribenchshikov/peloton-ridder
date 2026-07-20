import { requireAdminPage } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ClubForm } from "../ClubForm";

export default async function NewClubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/clubs/new");
  const t = await getTranslations("Admin");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="mb-8">
        <Link href="/admin/clubs" className="mb-2 block text-sm font-semibold text-ink-faint hover:text-ink">
          ← {t("backToClubsCta")}
        </Link>
        <h1 className="font-display text-2xl font-bold text-ink">{t("newRunningClubTitle")}</h1>
      </div>
      <ClubForm mode="create" locale={locale} />
    </main>
  );
}
