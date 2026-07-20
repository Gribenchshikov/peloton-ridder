import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { logoutAction } from "@/lib/authActions";

export function AdminView() {
  const t = useTranslations("Admin");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-ember">{t("eyebrow")}</span>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink">{t("title")}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            {t("backToSiteCta")}
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
            >
              {t("logoutCta")}
            </button>
          </form>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <AdminCard
          title={t("eventsTitle")}
          subtitle={t("eventsSubtitle")}
          href="/admin/events"
          cta={t("manageEventsCta")}
        />
        <AdminCard
          title={t("usersTitle")}
          subtitle={t("usersSubtitle")}
          href="/admin/users"
          cta={t("manageUsersCta")}
        />
        <AdminCard
          title={t("clubTitle")}
          subtitle={t("clubSubtitle")}
          href="/admin/club"
          cta={t("manageClubCta")}
        />
        <AdminCard
          title={t("racesTitle")}
          subtitle={t("racesSubtitle")}
          href="/admin/races"
          cta={t("manageRacesCta")}
        />
        <AdminCard
          title={t("partnersTitle")}
          subtitle={t("partnersSubtitle")}
          href="/admin/partners"
          cta={t("managePartnersCta")}
        />
        <AdminCard
          title={t("promoCodesAdminTitle")}
          subtitle={t("promoCodesAdminSubtitle")}
          href="/admin/promo-codes"
          cta={t("managePromoCodesCta")}
        />
        <AdminCard
          title={t("runningClubsAdminTitle")}
          subtitle={t("runningClubsAdminSubtitle")}
          href="/admin/clubs"
          cta={t("manageRunningClubsCta")}
        />
        <AdminCard
          title={t("seriesAdminTitle")}
          subtitle={t("seriesAdminSubtitle")}
          href="/admin/series"
          cta={t("manageSeriesCta")}
        />
        <AdminCard
          title={t("settingsTitle")}
          subtitle={t("settingsSubtitle")}
          href="/admin/settings"
          cta={t("manageSettingsCta")}
        />
        <AdminCard
          title={t("reportsTitle")}
          subtitle={t("reportsSubtitle")}
          href="/admin/reports"
          cta={t("reportsCta")}
        />
        <AdminCard
          title={t("volunteersTitle")}
          subtitle={t("volunteersSubtitle")}
          href="/admin/volunteers"
          cta={t("volunteersCta")}
        />
      </section>
    </main>
  );
}

function AdminCard({
  title,
  subtitle,
  href,
  cta,
}: {
  title: string;
  subtitle: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-[var(--radius-m)] border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
        </div>
        <Link
          href={href}
          className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}
