import { requireAdminPage } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSiteSetting } from "@/lib/queries";
import { SettingsView } from "./SettingsView";
import { RegistrationToggle } from "./RegistrationToggle";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/settings");

  const [t, heroBgUrl, registrationsOpen] = await Promise.all([
    getTranslations("Admin"),
    getSiteSetting("hero_bg_url"),
    getSiteSetting("registrations_open"),
  ]);

  const isOpen = registrationsOpen !== "false";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="mb-8">
        <Link href="/admin" className="mb-2 block text-sm font-semibold text-ink-faint hover:text-ink">
          ← {t("backToAdminCta")}
        </Link>
        <h1 className="font-display text-2xl font-bold text-ink">{t("settingsPageTitle")}</h1>
      </div>

      <div className="flex flex-col gap-6">
        <RegistrationToggle initialOpen={isOpen} />

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
      </div>
    </main>
  );
}
