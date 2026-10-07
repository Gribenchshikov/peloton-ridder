"use client";

import { useState, useMemo, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations, useFormatter } from "next-intl";
import { Icon } from "@/components/IconSprite";
import type { getAdminEvents } from "@/lib/queries";

type EventRow = Awaited<ReturnType<typeof getAdminEvents>>[number];

const ALL_STATUSES = ["DRAFT", "OPEN", "CLOSED", "COMPLETED"] as const;

const PAGE_SIZE = 10;

export function AdminEventsTable({ events }: { events: EventRow[] }) {
  const t = useTranslations("Admin");
  const tStatus = useTranslations("Status");
  const format = useFormatter();
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [nameFilter, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const displayed = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = (page - 1) * PAGE_SIZE + displayed.length;
  const hasFilters = nameFilter.trim() !== "" || statusFilter !== "";

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
                        href={`/admin/events/${event.id}`}
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
                        {!event.race.isMass && (
                          <Link
                            href={`/admin/registrations/${event.race.slug}/${event.year}`}
                            className="text-sm font-semibold text-ink-soft hover:text-ink"
                          >
                            {t("viewRegistrationsCta")}
                          </Link>
                        )}
                        <Link
                          href={`/events/${event.race.slug}/${event.year}`}
                          title={t("viewOnSiteCta")}
                          aria-label={t("viewOnSiteCta")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex text-ink-soft hover:text-ember"
                        >
                          <Icon name="i-eye" className="h-5 w-5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-faint">
              {t("eventsShownRange", { from, to, total: filtered.length })}
            </p>
            {totalPages > 1 && (
              <nav className="flex items-center gap-1" aria-label="Пагинация">
                <PageButton
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {t("eventsPagePrev")}
                </PageButton>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <PageButton
                    key={n}
                    active={n === page}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </PageButton>
                ))}
                <PageButton
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("eventsPageNext")}
                </PageButton>
              </nav>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? "page" : undefined}
      className={`rounded-[var(--radius-s)] px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-ember text-white"
          : "border border-border text-ink-soft hover:bg-surface-2 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
