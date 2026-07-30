import { requireAdminPage } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSiteSetting } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { parseSizeTable } from "@/types/sizeTable";
import { SettingsView } from "./SettingsView";
import { RegistrationToggle } from "./RegistrationToggle";
import { SizeTableEditor } from "./SizeTableEditor";
import { HomeStatsEditor } from "./HomeStatsEditor";
import { ContactInfoEditor } from "./ContactInfoEditor";
import { LegalDocsEditor } from "./LegalDocsEditor";
import { FontSelector } from "./FontSelector";
import { PartnershipEditor } from "./PartnershipEditor";
import { PageBackgroundsEditor } from "./PageBackgroundsEditor";
import type { StatItem, ContactInfo, PartnershipContent } from "@/lib/settingsActions";

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

const LEGAL_KEYS = [
  "legal_refund_ru", "legal_refund_kk", "legal_refund_en",
  "legal_offer_ru", "legal_offer_kk", "legal_offer_en",
  "legal_privacy_ru", "legal_privacy_kk", "legal_privacy_en",
  "legal_consent_ru", "legal_consent_kk", "legal_consent_en",
  "legal_payment_ru", "legal_payment_kk", "legal_payment_en",
];

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  const { tab } = await searchParams;
  await requireAdminPage(locale, "/admin/settings");

  const activeTab = tab === "docs" ? "docs" : tab === "partnership" ? "partnership" : tab === "backgrounds" ? "backgrounds" : "general";

  const [t, heroBgUrl, registrationsOpen, sizeTableRaw, homeStatsRaw, contactInfoRaw, displayFont, customFontName, customFontCss, partnershipRaw, bgPartnership, bgVolunteer, bgAbout, bgContact] = await Promise.all([
    getTranslations("Admin"),
    getSiteSetting("hero_bg_url"),
    getSiteSetting("registrations_open"),
    getSiteSetting("tshirt_size_table"),
    getSiteSetting("home_stats"),
    getSiteSetting("contact_info"),
    getSiteSetting("display_font"),
    getSiteSetting("custom_font_name"),
    getSiteSetting("custom_font_css"),
    getSiteSetting("partnership_content"),
    getSiteSetting("bg_partnership"),
    getSiteSetting("bg_volunteer"),
    getSiteSetting("bg_about"),
    getSiteSetting("bg_contact"),
  ]);

  const isOpen = registrationsOpen !== "false";
  const sizeRows = parseSizeTable(sizeTableRaw);

  let homeStats: StatItem[] = DEFAULT_STATS;
  try { if (homeStatsRaw) homeStats = JSON.parse(homeStatsRaw); } catch { /* use default */ }

  let contactInfo: ContactInfo = DEFAULT_CONTACT;
  try { if (contactInfoRaw) contactInfo = { ...DEFAULT_CONTACT, ...JSON.parse(contactInfoRaw) }; } catch { /* use default */ }

  let partnershipContent: PartnershipContent | null = null;
  try { if (partnershipRaw) partnershipContent = JSON.parse(partnershipRaw); } catch { /* use default */ }

  let legalDocs: Record<string, string> = {};
  if (activeTab === "docs") {
    const rows = await prisma.siteSetting.findMany({ where: { key: { in: LEGAL_KEYS } } });
    legalDocs = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="mb-8">
        <Link href="/admin" className="mb-2 block text-sm font-semibold text-ink-faint hover:text-ink">
          ← {t("backToAdminCta")}
        </Link>
        <h1 className="font-display text-2xl font-bold text-ink">{t("settingsPageTitle")}</h1>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-border">
        <Link
          href="?tab=general"
          className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${activeTab === "general" ? "border-ember text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}
        >
          Общие
        </Link>
        <Link
          href="?tab=docs"
          className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${activeTab === "docs" ? "border-ember text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}
        >
          Документы
        </Link>
        <Link
          href="?tab=partnership"
          className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${activeTab === "partnership" ? "border-ember text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}
        >
          Партнёрство
        </Link>
        <Link
          href="?tab=backgrounds"
          className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${activeTab === "backgrounds" ? "border-ember text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}
        >
          Фоны страниц
        </Link>
      </div>

      {activeTab === "general" && (
        <div className="flex flex-col gap-6">
          <FontSelector
            initial={displayFont ?? "unbounded"}
            initialCustomName={customFontName ?? null}
            initialCustomCss={customFontCss ?? null}
          />

          <RegistrationToggle initialOpen={isOpen} />

          <HomeStatsEditor initial={homeStats} />

          <ContactInfoEditor initial={contactInfo} />

          <SizeTableEditor initialRows={sizeRows} />
        </div>
      )}

      {activeTab === "docs" && (
        <LegalDocsEditor initial={legalDocs} />
      )}

      {activeTab === "partnership" && (
        <PartnershipEditor initial={partnershipContent} />
      )}

      {activeTab === "backgrounds" && (
        <PageBackgroundsEditor
          pages={[
            { key: "home", label: "Главная страница", currentUrl: heroBgUrl || null },
            { key: "partnership", label: "Страница «Партнёрство»", currentUrl: bgPartnership || null },
            { key: "volunteer", label: "Страница «Волонтёрство»", currentUrl: bgVolunteer || null },
            { key: "about", label: "Страница «О нас»", currentUrl: bgAbout || null },
            { key: "contact", label: "Страница «Контакты»", currentUrl: bgContact || null },
          ]}
        />
      )}
    </main>
  );
}
