import { requireAdminPage } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSiteSetting } from "@/lib/queries";
import { parseSizeTable } from "@/types/sizeTable";
import { SettingsView } from "./SettingsView";
import { RegistrationToggle } from "./RegistrationToggle";
import { SizeTableEditor } from "./SizeTableEditor";
import { HomeStatsEditor } from "./HomeStatsEditor";
import { ContactInfoEditor } from "./ContactInfoEditor";
import type { StatItem, ContactInfo } from "@/lib/settingsActions";

const DEFAULT_STATS: StatItem[] = [
  { value: "4", label: "старта за сезон" },
  { value: "7-й", label: "год клуба (с 2019)" },
  { value: "1 200+", label: "участников в сезоне" },
  { value: "3", label: "дистанции на каждом старте" },
];

const DEFAULT_CONTACT: ContactInfo = {
  phone1: "+7 700 000 0000",
  phone2: "+7 700 000 0001",
  email: "info@ridder.run",
};

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/settings");

  const [t, heroBgUrl, registrationsOpen, sizeTableRaw, homeStatsRaw, contactInfoRaw] = await Promise.all([
    getTranslations("Admin"),
    getSiteSetting("hero_bg_url"),
    getSiteSetting("registrations_open"),
    getSiteSetting("tshirt_size_table"),
    getSiteSetting("home_stats"),
    getSiteSetting("contact_info"),
  ]);

  const isOpen = registrationsOpen !== "false";
  const sizeRows = parseSizeTable(sizeTableRaw);

  let homeStats: StatItem[] = DEFAULT_STATS;
  try { if (homeStatsRaw) homeStats = JSON.parse(homeStatsRaw); } catch { /* use default */ }

  let contactInfo: ContactInfo = DEFAULT_CONTACT;
  try { if (contactInfoRaw) contactInfo = { ...DEFAULT_CONTACT, ...JSON.parse(contactInfoRaw) }; } catch { /* use default */ }

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

        <HomeStatsEditor initial={homeStats} />

        <ContactInfoEditor initial={contactInfo} />

        <SizeTableEditor initialRows={sizeRows} />

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
