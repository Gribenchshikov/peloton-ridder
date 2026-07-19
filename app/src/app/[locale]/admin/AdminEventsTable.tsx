"use client";

import { useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations, useFormatter } from "next-intl";
import type { getAdminEvents } from "@/lib/queries";

type EventRow = Awaited<ReturnType<typeof getAdminEvents>>[number];

const ALL_STATUSES = ["DRAFT", "OPEN", "CLOSED", "COMPLETED"] as const;

const DEFAULT_LIMIT = 10;

export function AdminEventsTable({ events }: { events: EventRow[] }) {
  const t = useTranslations("Admin");
  const tStatus = useTranslations("Status");
  const format = useFormatter();
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    let result = events;
    if (nameFilter.trim()) {
      const q = nameFilter.trim().toLowerCase();
      result = result.filter((e) =>
        `${e.race.name} ${e.year}`.toLowerCase().includes(q),
      );
    }
    if (statusFilter) {
      result = result.filter((e) => e.status === statusFilter);
    }
    return result;
  }, [events, nameFilter, statusFilter]);

  const hasFilters = nameFilter.trim() !== "" || statusFilter !== "";
  const displayed = hasFilters ? filtered : filtered.slice(0, DEFAULT_LIMIT);
  const hiddenCount = hasFilters ? 0 : filtered.length - DEFAULT_LIMIT;

  return (
    <div>
      <div className="mt-3 mb-3 flex flex-wrap gap-2">
        <input
          type="text"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          placeholder="Поиск по названию…"
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ember"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-ember"
        >
          <option value="">Все статусы</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {tStatus(s)}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setNameFilter("");
              setStatusFilter("");
            }}
            className="text-sm text-ink-faint hover:text-ink"
          >
            Сбросить
          </button>
        )}
      </div>

      {displayed.length === 0 ? (
        <p className="text-sm text-ink-faint">{t("eventsEmpty")}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-[var(--radius-m)] border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <tbody>
                {displayed.map((event) => (
                  <tr key={event.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-semibold text-ink">
                      <Link
                        href={`/events/${event.race.slug}/${event.year}`}
                        className="hover:text-ember"
                      >
                        {event.race.name} {event.year}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft">
                      {format.dateTime(event.dateISO, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-ink-faint">{tStatus(event.status)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <Link
                          href={`/admin/registrations/${event.race.slug}/${event.year}`}
                          className="text-sm font-semibold text-ink-soft hover:text-ink"
                        >
                          {t("viewRegistrationsCta")}
                        </Link>
                        <Link
                          href={`/admin/events/${event.id}`}
                          className="font-semibold text-ink hover:text-ember"
                        >
                          {t("editCta")}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hiddenCount > 0 && (
            <p className="mt-2 text-xs text-ink-faint">
              Показано {DEFAULT_LIMIT} из {filtered.length}. Используйте фильтр для поиска.
            </p>
          )}
        </>
      )}
    </div>
  );
}
