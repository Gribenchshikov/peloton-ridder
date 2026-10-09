import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { logoutAction } from "@/lib/authActions";

export function AdminView({ pendingRefundCount = 0 }: { pendingRefundCount?: number }) {
  const t = useTranslations("Admin");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-14">

      {/* Header */}
      <div className="mb-12 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-ember">{t("eyebrow")}</span>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink">{t("title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
          >
            {t("backToSiteCta")}
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {t("logoutCta")}
            </button>
          </form>
        </div>
      </div>

      {pendingRefundCount > 0 && (
        <Link
          href="/admin/refunds"
          className="mb-8 flex items-center justify-between gap-3 rounded-[var(--radius-m)] border border-warn/40 bg-warn-tint px-5 py-4 transition-colors hover:border-warn"
        >
          <span className="text-sm font-bold text-warn">
            Есть необработанные заявки на возврат ({pendingRefundCount})
          </span>
          <span className="shrink-0 text-sm font-semibold text-warn">Открыть →</span>
        </Link>
      )}

      <div className="flex flex-col gap-12">

        {/* ── Мероприятия ── */}
        <Group label="Мероприятия" icon="🏔">
          <Card icon="🏁" title={t("eventsTitle")} desc={t("eventsSubtitle")} href="/admin/events" />
          <Card icon="🔗" title={t("seriesAdminTitle")} desc={t("seriesAdminSubtitle")} href="/admin/series" />
          <Card icon="🗺" title={t("racesTitle")} desc={t("racesSubtitle")} href="/admin/races" />
        </Group>

        {/* ── Участники ── */}
        <Group label="Участники" icon="👥">
          <Card icon="👤" title={t("usersTitle")} desc={t("usersSubtitle")} href="/admin/users" />
          <Card icon="🤝" title={t("volunteersTitle")} desc={t("volunteersSubtitle")} href="/admin/volunteers" />
          <Card icon="🏃" title={t("runningClubsAdminTitle")} desc={t("runningClubsAdminSubtitle")} href="/admin/clubs" />
          <Card icon="🏷" title={t("promoCodesAdminTitle")} desc={t("promoCodesAdminSubtitle")} href="/admin/promo-codes" />
        </Group>

        {/* ── Контент ── */}
        <Group label="Контент и настройки" icon="✏️">
          <Card icon="🧑‍🤝‍🧑" title={t("clubTitle")} desc={t("clubSubtitle")} href="/admin/club" />
          <Card icon="🤝" title={t("partnersTitle")} desc={t("partnersSubtitle")} href="/admin/partners" />
          <Card icon="⚙️" title={t("settingsTitle")} desc={t("settingsSubtitle")} href="/admin/settings" accent />
        </Group>

        {/* ── Финансы ── */}
        <Group label="Финансы" icon="📊">
          <Card icon="📈" title={t("reportsTitle")} desc={t("reportsSubtitle")} href="/admin/reports" />
        </Group>

      </div>
    </main>
  );
}

function Group({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <section>
      {/* Group header */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-widest text-ink-faint">{label}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      {/* Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

function Card({
  icon,
  title,
  desc,
  href,
  accent,
}: {
  icon: string;
  title: string;
  desc: string;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col gap-3 rounded-[var(--radius-m)] border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        accent ? "border-ember/40 hover:border-ember/70" : "border-border hover:border-border-strong"
      }`}
    >
      {/* Icon */}
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-s)] text-lg ${
          accent ? "bg-ember/15" : "bg-surface-2"
        }`}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1">
        <p className="font-display font-bold text-ink">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{desc}</p>
      </div>

      {/* Arrow */}
      <div className="flex items-center justify-end">
        <svg
          className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${accent ? "text-ember" : "text-ink-faint"}`}
          viewBox="0 0 16 16" fill="none"
        >
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Link>
  );
}
