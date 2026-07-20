import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSiteSetting } from "@/lib/queries";
import { SettingsView } from "./SettingsView";

export default async function SettingsPage() {
  const adminId = await requireAdminId();
  if (!adminId) redirect({ href: "/", locale: await getLocale() });

  const [t, heroBgUrl] = await Promise.all([
    getTranslations("Admin"),
    getSiteSetting("hero_bg_url"),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="mb-8">
        <Link href="/admin" className="mb-2 block text-sm font-semibold text-ink-faint hover:text-ink">
          ← {t("backToAdminCta")}
        </Link>
        <h1 className="font-display text-2xl font-bold text-ink">{t("settingsPageTitle")}</h1>
      </div>

      <SettingsView
        currentUrl={heroBgUrl || null}
        labels={{
          heroLabel: t("settingsHeroLabel"),
          save: t("settingsHeroSave"),
          saved: t("settingsHeroSaved"),
          error: t("settingsHeroError"),
          current: t("settingsHeroCurrent"),
          remove: t("settingsHeroRemove"),
        }}
      />
    </main>
  );
}
