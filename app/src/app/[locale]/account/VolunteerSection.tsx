import { Link } from "@/i18n/navigation";
import { getUserProfile } from "@/lib/queries";

type VolunteerApp = NonNullable<Awaited<ReturnType<typeof getUserProfile>>>["volunteerApplications"][number];

const VOLUNTEER_STATUS_STYLES: Record<string, { badge: string; label: string }> = {
  PENDING: { badge: "text-amber-600 dark:text-amber-400", label: "На рассмотрении" },
  APPROVED: { badge: "text-emerald-600 dark:text-emerald-400", label: "Одобрена ✓" },
  REJECTED: { badge: "text-red-500", label: "Отклонена" },
};

export function VolunteerSection({ applications }: { applications: VolunteerApp[] }) {
  const countByEvent: Record<string, number> = {};
  for (const app of applications) {
    countByEvent[app.eventId] = (countByEvent[app.eventId] ?? 0) + 1;
  }

  return (
    <div>
      <ul className="flex flex-col gap-3">
        {applications.map((app) => {
          const s = VOLUNTEER_STATUS_STYLES[app.status] ?? VOLUNTEER_STATUS_STYLES.PENDING;
          const borderColor =
            app.status === "APPROVED"
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
              : app.status === "REJECTED"
                ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20"
                : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20";
          const canReapply = app.status === "REJECTED" && (countByEvent[app.eventId] ?? 0) < 2;
          return (
            <li key={app.id} className={`rounded-[var(--radius-m)] border p-4 ${borderColor}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">
                    {app.event.race.name} {app.event.year}
                  </p>
                  <p className={`mt-0.5 text-xs font-bold uppercase tracking-wide ${s.badge}`}>{s.label}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {app.status === "APPROVED" && (
                    <>
                      {app.event.volunteerChatUrl && (
                        <a
                          href={app.event.volunteerChatUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white hover:opacity-90"
                        >
                          Чат волонтёров →
                        </a>
                      )}
                      <Link
                        href={`/admin/registrations/${app.event.race.slug}/${app.event.year}/kit`}
                        className="rounded-[var(--radius-s)] border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
                      >
                        Выдача наборов →
                      </Link>
                    </>
                  )}
                  {canReapply && (
                    <Link
                      href={`/volunteer/apply?eventId=${app.eventId}`}
                      className="rounded-[var(--radius-s)] border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
                    >
                      Подать повторно →
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
