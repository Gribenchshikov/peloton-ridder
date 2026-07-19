import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { getHomeEvents } from "@/lib/queries";
import { logoutAction } from "@/lib/authActions";

type EventRow = Awaited<ReturnType<typeof getHomeEvents>>[number];

export function AdminView({ events }: { events: EventRow[] }) {
  const t = useTranslations("Admin");
  const tStatus = useTranslations("Status");
  const format = useFormatter();

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
          <h2 className="font-display text-lg font-bold text-ink">{t("eventsTitle")}</h2>
          <Link
            href="/admin/events/new"
            className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
          >
            {t("createEventCta")}
          </Link>
        </div>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-ink-faint">{t("eventsEmpty")}</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-[var(--radius-m)] border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-semibold text-ink">
                      <Link href={`/events/${event.race.slug}/${event.year}`} className="hover:text-ember">
                        {event.race.name} {event.year}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft">
                      {format.dateTime(event.dateISO, { day: "numeric", month: "long", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5 text-ink-faint">{tStatus(event.status)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <Link href={`/admin/registrations/${event.race.slug}/${event.year}`} className="text-sm font-semibold text-ink-soft hover:text-ink">
                          {t("viewRegistrationsCta")}
                        </Link>
                        <Link href={`/admin/events/${event.id}`} className="font-semibold text-ink hover:text-ember">
                          {t("editCta")}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
