import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { getEventWithRegistrations } from "@/lib/queries";
import { RegistrationActions } from "./RegistrationActions";

type EventData = NonNullable<Awaited<ReturnType<typeof getEventWithRegistrations>>>;
type Registration = EventData["registrations"][number];

function StatusBadge({ status }: { status: Registration["status"] }) {
  const t = useTranslations("Admin");
  const isPaid = status === "PAID";
  const isCancelled = status === "CANCELLED";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        isPaid
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : isCancelled
            ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
            : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      ].join(" ")}
    >
      {isPaid ? t("regStatusPaid") : isCancelled ? t("regStatusCancelled") : t("regStatusReserved")}
    </span>
  );
}

export function RegistrationsView({ event }: { event: EventData }) {
  const t = useTranslations("Admin");
  const format = useFormatter();

  const paid = event.registrations.filter((r) => r.status === "PAID");
  const reserved = event.registrations.filter((r) => r.status === "RESERVED");

  const capacityByDistance = Object.fromEntries(
    event.distances.map((d) => [d.id, d.bibRangeEnd - d.bibRangeStart + 1])
  );
  const paidByDistance = Object.fromEntries(
    event.distances.map((d) => [d.id, paid.filter((r) => r.distance.id === d.id).length])
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/admin/events/${event.id}`}
            className="text-sm font-semibold text-ink-faint transition-colors hover:text-ink"
          >
            ← {event.race.name} {event.year}
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink">
            {t("registrationsTitle")}
          </h1>
        </div>
        <a
          href={`/admin/registrations/${event.race.slug}/${event.year}/export`}
          className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          {t("exportCsvCta")}
        </a>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-[var(--radius-m)] border border-border bg-surface-2 px-5 py-4">
          <div className="text-2xl font-bold text-ink">{paid.length}</div>
          <div className="mt-0.5 text-xs text-ink-soft">{t("regStatusPaid")}</div>
        </div>
        <div className="rounded-[var(--radius-m)] border border-border bg-surface-2 px-5 py-4">
          <div className="text-2xl font-bold text-ink">{reserved.length}</div>
          <div className="mt-0.5 text-xs text-ink-soft">{t("regStatusReserved")}</div>
        </div>
        <div className="rounded-[var(--radius-m)] border border-border bg-surface-2 px-5 py-4">
          <div className="text-2xl font-bold text-ink">{event.registrations.length}</div>
          <div className="mt-0.5 text-xs text-ink-soft">{t("regColTotal")}</div>
        </div>
      </div>

      {/* Per-distance breakdown */}
      {event.distances.length > 0 && (
        <div className="overflow-x-auto rounded-[var(--radius-m)] border border-border">
          <table className="w-full min-w-[400px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColDistance")}</th>
                <th className="px-4 py-2.5 text-right font-semibold text-ink-soft">{t("regStatusPaid")}</th>
                <th className="px-4 py-2.5 text-right font-semibold text-ink-soft">{t("regColCapacity")}</th>
              </tr>
            </thead>
            <tbody>
              {event.distances.map((d) => {
                const cap = capacityByDistance[d.id];
                const cnt = paidByDistance[d.id];
                const pct = cap > 0 ? Math.round((cnt / cap) * 100) : 0;
                return (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium text-ink">
                      {d.name} <span className="text-ink-faint">({d.km} км)</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-ink">
                      {cnt}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">
                      {cap} <span className="text-ink-faint">({pct}%)</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Waitlist */}
      {"waitlist" in event && Array.isArray(event.waitlist) && event.waitlist.length > 0 && (
        <div>
          <h2 className="font-display text-base font-bold text-ink">{t("waitlistTitle")} ({event.waitlist.length})</h2>
          <div className="mt-3 overflow-x-auto rounded-[var(--radius-m)] border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColName")}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColEmail")}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColPhone")}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColDistance")}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("waitlistNote")}</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-ink-soft">{t("regColDate")}</th>
                </tr>
              </thead>
              <tbody>
                {event.waitlist.map((w) => (
                  <tr key={w.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                    <td className="px-4 py-2.5 font-medium text-ink">{w.user.firstName} {w.user.lastName}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{w.user.email}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{w.user.phone ?? "—"}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{w.distance.name}</td>
                    <td className="max-w-56 px-4 py-2.5 text-xs text-ink-soft">{w.contactNote || "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-faint">
                      {format.dateTime(w.createdAt, { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Registrations table */}
      {event.registrations.length === 0 ? (
        <p className="text-sm text-ink-faint">{t("registrationsEmpty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-m)] border border-border">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColBib")}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColName")}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColEmail")}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColPhone")}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColDistance")}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColStatus")}</th>
                <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColComment")}</th>
                <th className="px-4 py-2.5 text-right font-semibold text-ink-soft">{t("regColDate")}</th>
                <th className="px-4 py-2.5 text-right font-semibold text-ink-soft">{t("regColActions")}</th>
              </tr>
            </thead>
            <tbody>
              {event.registrations.map((reg) => (
                <tr key={reg.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-2.5 tabular-nums text-ink-faint">
                    {reg.bibNumber ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-ink">
                    {reg.user.firstName} {reg.user.lastName}
                  </td>
                  <td className="px-4 py-2.5 text-ink-soft">{reg.user.email}</td>
                  <td className="px-4 py-2.5 text-ink-soft">{reg.user.phone ?? "—"}</td>
                  <td className="px-4 py-2.5 text-ink-soft">
                    {reg.distance.name}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={reg.status} />
                  </td>
                  <td className="max-w-56 px-4 py-2.5 text-xs text-ink-soft">
                    {reg.adminComment ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-faint">
                    {format.dateTime(reg.createdAt, { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-2.5">
                    <RegistrationActions
                      registrationId={reg.id}
                      eventId={event.id}
                      distanceId={reg.distance.id}
                      status={reg.status}
                      allowReregistration={reg.allowReregistration}
                      distances={event.distances}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
