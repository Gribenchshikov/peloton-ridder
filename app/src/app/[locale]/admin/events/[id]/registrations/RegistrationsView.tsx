"use client";

import { useState, useMemo, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { getEventWithRegistrations } from "@/lib/queries";
import { RegistrationActions } from "./RegistrationActions";
import { RefundRequestsSection } from "./RefundRequestsSection";
import { toggleKitIssuedAction, toggleTransferBoardedAction } from "./actions";

type EventData = NonNullable<Awaited<ReturnType<typeof getEventWithRegistrations>>>;
type Registration = EventData["registrations"][number];

function InlineCheckbox({
  checked: initialChecked,
  onToggle,
}: {
  checked: boolean;
  onToggle: (next: boolean) => Promise<{ error?: string }>;
}) {
  const [checked, setChecked] = useState(initialChecked);
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    setChecked(next);
    startTransition(async () => {
      const res = await onToggle(next);
      if (res.error) setChecked(!next);
    });
  }

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={handleChange}
      disabled={pending}
      className="h-4 w-4 cursor-pointer accent-ember disabled:opacity-50"
    />
  );
}

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

type StatusFilter = "ALL" | "PAID" | "RESERVED" | "CANCELLED";
type TransferFilter = "ALL" | "YES" | "NO";

function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={[
            "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
            value === o.value
              ? "bg-ember text-white"
              : "border border-border bg-surface-2 text-ink-soft hover:text-ink",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const CANCEL_REASON_LABELS: Record<string, string> = {
  INJURY: "Травма / болезнь",
  CANT_ATTEND: "Не смогу приехать",
  FINANCIAL: "Финансовые причины",
  FAMILY: "Семейные обстоятельства",
  CONFLICT: "Другое мероприятие",
  NOT_READY: "Не готов физически",
  DEFER: "Перенесу на след. год",
  OTHER: "Другое",
};

export function RegistrationsView({ event }: { event: EventData }) {
  const t = useTranslations("Admin");
  const format = useFormatter();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [distanceFilter, setDistanceFilter] = useState<string>("ALL");
  const [transferFilter, setTransferFilter] = useState<TransferFilter>("ALL");

  const paid = event.registrations.filter((r) => r.status === "PAID");
  const reserved = event.registrations.filter((r) => r.status === "RESERVED");

  const capacityByDistance = Object.fromEntries(
    event.distances.map((d) => {
      const bib = (d.bibRangeStart !== null && d.bibRangeEnd !== null) ? d.bibRangeEnd - d.bibRangeStart + 1 : null;
      return [d.id, bib];
    })
  );
  const paidByDistance = Object.fromEntries(
    event.distances.map((d) => [d.id, paid.filter((r) => r.distance?.id === d.id).length])
  );

  const filtered = useMemo(() => {
    return event.registrations.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (distanceFilter !== "ALL") {
        if (distanceFilter === "TRANSFER_ONLY") {
          if (!r.isTransferOnly) return false;
        } else {
          if (r.distance?.id !== distanceFilter) return false;
        }
      }
      if (transferFilter === "YES" && !r.includesTransfer && !r.isTransferOnly) return false;
      if (transferFilter === "NO" && (r.includesTransfer || r.isTransferOnly)) return false;
      return true;
    });
  }, [event.registrations, statusFilter, distanceFilter, transferFilter]);

  const exportParams = new URLSearchParams();
  if (statusFilter !== "ALL") exportParams.set("status", statusFilter);
  if (distanceFilter !== "ALL") exportParams.set("distanceId", distanceFilter);
  if (transferFilter !== "ALL") exportParams.set("transfer", transferFilter === "YES" ? "yes" : "no");
  const exportHref = `/admin/registrations/${event.race.slug}/${event.year}/export${exportParams.size > 0 ? "?" + exportParams.toString() : ""}`;

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "ALL", label: "Все" },
    { value: "PAID", label: t("regStatusPaid") },
    { value: "RESERVED", label: t("regStatusReserved") },
    { value: "CANCELLED", label: t("regStatusCancelled") },
  ];

  const distanceOptions: { value: string; label: string }[] = [
    { value: "ALL", label: "Все" },
    ...event.distances.map((d) => ({ value: d.id, label: `${d.name} (${d.km} км)` })),
    { value: "TRANSFER_ONLY", label: "Только трансфер" },
  ];

  const transferOptions: { value: TransferFilter; label: string }[] = [
    { value: "ALL", label: "Все" },
    { value: "YES", label: "Да" },
    { value: "NO", label: "Нет" },
  ];

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
        <div className="flex gap-2">
          <Link
            href={`/admin/registrations/${event.race.slug}/${event.year}/kit`}
            className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            {t("kitPickupCta")}
          </Link>

          <Link
            href={`/admin/registrations/${event.race.slug}/${event.year}/summary`}
            className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            {t("summaryCta")}
          </Link>
          <a
            href={`/admin/registrations/${event.race.slug}/${event.year}/export?type=kit`}
            className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            CSV выдача
          </a>
          <a
            href={`/admin/registrations/${event.race.slug}/${event.year}/export?type=transfer`}
            className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            CSV трансфер
          </a>
          <a
            href={exportHref}
            className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            {t("exportCsvCta")}
          </a>
        </div>
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
        <div className="rounded-[var(--radius-m)] border border-border bg-surface-2 px-5 py-4">
          <div className="text-2xl font-bold text-ink">
            {paid.filter((r) => r.includesTransfer || r.isTransferOnly).length}
          </div>
          <div className="mt-0.5 text-xs text-ink-soft">С трансфером</div>
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
                const pct = (cap != null && cap > 0) ? Math.round((cnt / cap) * 100) : 0;
                return (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium text-ink">
                      {d.name} <span className="text-ink-faint">({d.km} км)</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-ink">
                      {cnt}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">
                      {cap != null ? <>{cap} <span className="text-ink-faint">({pct}%)</span></> : "∞"}
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

      {/* Pending refund requests */}
      <RefundRequestsSection
        refunds={event.registrations
          .flatMap((r) =>
            (r.refundRequests ?? []).map((req) => ({
              ...req,
              registration: { id: r.id, eventId: event.id, user: r.user, distance: r.distance },
            }))
          )}
      />

      {/* Filters */}
      <div className="rounded-[var(--radius-m)] border border-border bg-surface-2 p-4">
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Статус</span>
            <FilterChips options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Дистанция</span>
            <FilterChips options={distanceOptions} value={distanceFilter} onChange={setDistanceFilter} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Трансфер</span>
            <FilterChips options={transferOptions} value={transferFilter} onChange={setTransferFilter} />
          </div>
        </div>
      </div>

      {/* Registrations table */}
      {filtered.length === 0 ? (
        <p className="text-sm text-ink-faint">
          {event.registrations.length === 0 ? t("registrationsEmpty") : "Нет участников по выбранным фильтрам."}
        </p>
      ) : (
        <div>
          <p className="mb-3 text-sm text-ink-faint">
            Показано: <span className="font-semibold text-ink">{filtered.length}</span> из {event.registrations.length}
          </p>
          <div className="overflow-x-auto rounded-[var(--radius-m)] border border-border">
            <table className="w-full min-w-[1180px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColBib")}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColName")}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColEmail")}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColPhone")}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColDistance")}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">Трансфер</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColStatus")}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">{t("regColComment")}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">Квалификация</th>
                  <th className="px-4 py-2.5 text-center font-semibold text-ink-soft">Пакет</th>
                  <th className="px-4 py-2.5 text-center font-semibold text-ink-soft">Посадка</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-ink-soft">{t("regColDate")}</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-ink-soft">{t("regColActions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((reg, idx) => {
                  const hasTransfer = reg.includesTransfer || reg.isTransferOnly;
                  return (
                    <tr key={reg.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                      <td className="px-4 py-2.5 tabular-nums text-ink-faint">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-ink">
                        {reg.user.firstName} {reg.user.lastName}
                      </td>
                      <td className="px-4 py-2.5 text-ink-soft">{reg.user.email}</td>
                      <td className="px-4 py-2.5 text-ink-soft">{reg.user.phone ?? "—"}</td>
                      <td className="px-4 py-2.5 text-ink-soft">
                        {reg.isTransferOnly ? "Только трансфер" : (reg.distance?.name ?? "—")}
                      </td>
                      <td className="px-4 py-2.5">
                        {hasTransfer ? (
                          <span className="inline-flex items-center rounded-full bg-spruce/10 px-2 py-0.5 text-xs font-semibold text-spruce">
                            Да
                          </span>
                        ) : (
                          <span className="text-xs text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={reg.status} />
                      </td>
                      <td className="max-w-64 px-4 py-2.5 text-xs text-ink-soft">
                        {reg.status === "CANCELLED" && reg.cancelReason ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-block w-fit rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                              {CANCEL_REASON_LABELS[reg.cancelReason] ?? reg.cancelReason}
                            </span>
                            {reg.cancelComment && (
                              <span className="text-ink-faint">{reg.cancelComment}</span>
                            )}
                            {reg.adminComment && (
                              <span className="text-ink-faint italic">{reg.adminComment}</span>
                            )}
                          </div>
                        ) : (
                          reg.adminComment ?? "—"
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {reg.qualificationUrl ? (
                          <a
                            href={reg.qualificationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ember hover:underline"
                          >
                            Открыть ↗
                          </a>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <InlineCheckbox
                          checked={reg.kitPickedUpAt !== null}
                          onToggle={(v) => toggleKitIssuedAction(reg.id, event.id, v)}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {(reg.includesTransfer || reg.isTransferOnly) ? (
                          <InlineCheckbox
                            checked={reg.transferUsedAt !== null}
                            onToggle={(v) => toggleTransferBoardedAction(reg.id, event.id, v)}
                          />
                        ) : (
                          <span className="text-xs text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink-faint">
                        {format.dateTime(reg.createdAt, { day: "numeric", month: "short" })}
                      </td>
                      <td className="px-4 py-2.5">
                        <RegistrationActions
                          registrationId={reg.id}
                          eventId={event.id}
                          distanceId={reg.distance?.id ?? ""}
                          status={reg.status}
                          allowReregistration={reg.allowReregistration}
                          distances={event.distances}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
