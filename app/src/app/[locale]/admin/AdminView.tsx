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

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-ink">{t("usersTitle")}</h2>
          <Link
            href="/admin/users"
            className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            {t("manageUsersCta")}
          </Link>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-ink">{t("clubTitle")}</h2>
          <Link
            href="/admin/club"
            className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            {t("manageClubCta")}
          </Link>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-ink">{t("racesTitle")}</h2>
          <Link
            href="/admin/races"
            className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            {t("manageRacesCta")}
          </Link>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-ink">{t("partnersTitle")}</h2>
          <Link
            href="/admin/partners"
            className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            {t("managePartnersCta")}
          </Link>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-ink">{t("eventsTitle")}</h2>
          <Link
            href="/admin/events/new"
            className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
          >
            {t("createEventCta")}
          </Link>
        </div>
        <AdminEventsTable events={events} />
      </section>
    </main>
  );
}
