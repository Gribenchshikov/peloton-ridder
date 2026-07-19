import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { getAdminEvents } from "@/lib/queries";
import { logoutAction } from "@/lib/authActions";
import { AdminEventsTable } from "./AdminEventsTable";

type EventRow = Awaited<ReturnType<typeof getAdminEvents>>[number];

export function AdminView({ events }: { events: EventRow[] }) {
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
        <div className="rounded-[var(--radius-m)] border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">{t("usersTitle")}</h2>
              <p className="mt-1 text-sm text-ink-soft">{t("usersSubtitle")}</p>
            </div>
            <Link
              href="/admin/users"
              className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
            >
              {t("manageUsersCta")}
            </Link>
          </div>
        </div>

        <div className="rounded-[var(--radius-m)] border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">{t("clubTitle")}</h2>
              <p className="mt-1 text-sm text-ink-soft">{t("clubSubtitle")}</p>
            </div>
            <Link
              href="/admin/club"
              className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
            >
              {t("manageClubCta")}
            </Link>
          </div>
        </div>

        <div className="rounded-[var(--radius-m)] border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">{t("racesTitle")}</h2>
              <p className="mt-1 text-sm text-ink-soft">{t("racesSubtitle")}</p>
            </div>
            <Link
              href="/admin/races"
              className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
            >
              {t("manageRacesCta")}
            </Link>
          </div>
        </div>

        <div className="rounded-[var(--radius-m)] border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">{t("partnersTitle")}</h2>
              <p className="mt-1 text-sm text-ink-soft">{t("partnersSubtitle")}</p>
            </div>
            <Link
              href="/admin/partners"
              className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
            >
              {t("managePartnersCta")}
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-[var(--radius-m)] border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">{t("eventsTitle")}</h2>
            <p className="mt-1 text-sm text-ink-soft">{t("eventsSubtitle")}</p>
          </div>
          <Link
            href="/admin/events/new"
            className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
          >
            {t("createEventCta")}
          </Link>
        </div>
      </section>

      <section>
        <AdminEventsTable events={events} />
      </section>
    </main>
  );
}
