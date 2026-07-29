"use client";

import { useMemo } from "react";
import type { CancelReason } from "@/generated/prisma/client";

type Reg = {
  id: string;
  status: string;
  createdAt: Date;
  discountAmount: number;
  cancelReason: CancelReason | null;
  distance: { price: number; name: string; km: number; maxSlots: number | null; id: string } | null;
  event: { id: string; year: number; race: { name: string } };
};

type Distance = {
  id: string;
  name: string;
  km: number;
  maxSlots: number | null;
  _count: { registrations: number };
};

type MerchRow = {
  size: string | null;
  itemName: string;
};

type Props = {
  registrations: Reg[];
  distances: Distance[];
  merch: MerchRow[];
  selectedEventName: string;
};

const CANCEL_REASON_LABELS: Record<string, string> = {
  INJURY: "Травма / болезнь",
  CANT_ATTEND: "Не смогу приехать",
  FINANCIAL: "Финансовые причины",
  FAMILY: "Семейные обстоятельства",
  CONFLICT: "Другое мероприятие",
  NOT_READY: "Не готов физически",
  DEFER: "Перенос на следующий год",
  OTHER: "Другое",
};

function kzt(n: number) {
  return `${n.toLocaleString("ru-KZ")} ₸`;
}

export function ReportsView({ registrations, distances, merch, selectedEventName }: Props) {
  const paid = useMemo(() => registrations.filter((r) => r.status === "PAID"), [registrations]);
  const reserved = useMemo(() => registrations.filter((r) => r.status === "RESERVED"), [registrations]);
  const cancelled = useMemo(() => registrations.filter((r) => r.status === "CANCELLED"), [registrations]);

  const grossRevenue = useMemo(() => paid.reduce((s, r) => s + (r.distance?.price ?? 0), 0), [paid]);
  const totalDiscounts = useMemo(() => paid.reduce((s, r) => s + r.discountAmount, 0), [paid]);
  const netRevenue = grossRevenue - totalDiscounts;

  // By distance breakdown (transfer-only registrations have no distance — use a sentinel key)
  const byDistance = useMemo(() => {
    const map = new Map<string, { name: string; km: number; paid: number; reserved: number; gross: number; discounts: number }>();
    for (const r of registrations) {
      const key = r.distance?.id ?? "__transfer__";
      const existing = map.get(key) ?? { name: r.distance?.name ?? "Трансфер", km: r.distance?.km ?? 0, paid: 0, reserved: 0, gross: 0, discounts: 0 };
      if (r.status === "PAID") { existing.paid++; existing.gross += r.distance?.price ?? 0; existing.discounts += r.discountAmount; }
      if (r.status === "RESERVED") existing.reserved++;
      map.set(key, existing);
    }
    return [...map.values()].sort((a, b) => b.km - a.km);
  }, [registrations]);

  // Daily registrations (all statuses, by date)
  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of registrations) {
      const day = new Date(r.createdAt).toISOString().slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + 1);
    }
    const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([date, count]) => ({ date, count }));
  }, [registrations]);

  // Cancellation reasons
  const cancelReasons = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of cancelled) {
      if (r.cancelReason) {
        map.set(r.cancelReason, (map.get(r.cancelReason) ?? 0) + 1);
      }
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a);
  }, [cancelled]);

  // Merch summary
  const merchSummary = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const row of merch) {
      const itemMap = map.get(row.itemName) ?? new Map<string, number>();
      const size = row.size ?? "—";
      itemMap.set(size, (itemMap.get(size) ?? 0) + 1);
      map.set(row.itemName, itemMap);
    }
    return [...map.entries()];
  }, [merch]);

  const maxDaily = Math.max(...dailyData.map((d) => d.count), 1);

  return (
    <div className="flex flex-col gap-8">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard label="Всего регистраций" value={registrations.length} sub={`оплачено: ${paid.length} · бронь: ${reserved.length}`} />
        <KpiCard label="Валовая выручка" value={kzt(grossRevenue)} />
        <KpiCard label="Потерянная выгода" value={kzt(totalDiscounts)} />
        <KpiCard label="Чистая выручка" value={kzt(netRevenue)} accent />
      </div>

      {/* By distance */}
      {byDistance.length > 0 && (
        <Section title="По дистанциям">
          <div className="overflow-x-auto rounded-[var(--radius-s)] border border-border">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="px-4 py-2.5 text-left font-semibold text-ink-faint">Дистанция</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-ink-faint tabular-nums">Оплачено</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-ink-faint tabular-nums">Бронь</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-ink-faint tabular-nums">Выручка</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-ink-faint tabular-nums">Потерянная выгода</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-ink-faint tabular-nums">Чистая</th>
                </tr>
              </thead>
              <tbody>
                {byDistance.map((d) => (
                  <tr key={d.name} className="border-b border-border last:border-0 hover:bg-surface-2">
                    <td className="px-4 py-2.5 font-medium text-ink">{d.name} <span className="text-ink-faint">· {d.km} км</span></td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink">{d.paid}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{d.reserved}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink">{kzt(d.gross)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-dawn">{d.discounts > 0 ? `−${kzt(d.discounts)}` : "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-ink">{kzt(d.gross - d.discounts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Slot occupancy (only when event is selected) */}
      {distances.length > 0 && (
        <Section title="Заполняемость слотов">
          <div className="flex flex-col gap-3">
            {distances.map((d) => {
              const used = d._count.registrations;
              const max = d.maxSlots;
              const pct = max ? Math.round((used / max) * 100) : null;
              return (
                <div key={d.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{d.name}</span>
                    <span className="tabular-nums text-ink-soft">
                      {used}{max ? ` / ${max}` : ""}{pct !== null ? ` (${pct}%)` : ""}
                    </span>
                  </div>
                  {max && (
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-ember transition-all"
                        style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Daily registrations chart */}
      {dailyData.length > 0 && (
        <Section title="Динамика регистраций">
          <div className="overflow-x-auto">
            <div className="flex min-w-0 items-end gap-1" style={{ height: 120, minWidth: dailyData.length * 28 }}>
              {dailyData.map(({ date, count }) => (
                <div key={date} className="group relative flex flex-1 flex-col items-center justify-end" style={{ minWidth: 20 }}>
                  <div
                    className="w-full rounded-t-sm bg-ember transition-all hover:bg-ember-strong"
                    style={{ height: `${Math.round((count / maxDaily) * 100)}%`, minHeight: 4 }}
                  />
                  <div className="absolute bottom-full mb-1 hidden whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                    {date}: {count}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-ink-faint">
              <span>{dailyData[0]?.date}</span>
              <span>{dailyData[dailyData.length - 1]?.date}</span>
            </div>
          </div>
        </Section>
      )}

      {/* Cancellation reasons */}
      {cancelReasons.length > 0 && (
        <Section title="Причины отмены">
          <div className="flex flex-col gap-2">
            {cancelReasons.map(([reason, count]) => {
              const pct = Math.round((count / cancelled.length) * 100);
              return (
                <div key={reason} className="flex items-center gap-3">
                  <div className="w-44 shrink-0 text-sm text-ink-soft">{CANCEL_REASON_LABELS[reason] ?? reason}</div>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-danger/60" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-12 text-right text-sm tabular-nums text-ink-faint">{count} ({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Merch */}
      {merchSummary.length > 0 && (
        <Section title="Сводка по мерчу (PAID)">
          <div className="flex flex-col gap-5">
            {merchSummary.map(([itemName, sizeMap]) => (
              <div key={itemName}>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">{itemName}</div>
                <div className="flex flex-wrap gap-2">
                  {[...sizeMap.entries()].sort().map(([size, qty]) => (
                    <div
                      key={size}
                      className="flex flex-col items-center rounded-[var(--radius-s)] border border-border bg-surface px-4 py-2.5 text-center"
                    >
                      <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">{size}</span>
                      <span className="mt-0.5 text-lg font-bold tabular-nums text-ink">{qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {registrations.length === 0 && (
        <p className="text-sm text-ink-faint">Нет данных для выбранного периода.</p>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-[var(--radius-m)] border p-4 ${accent ? "border-ember/30 bg-ember/5" : "border-border bg-surface"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-1.5 text-xl font-bold tabular-nums ${accent ? "text-ember" : "text-ink"}`}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-ink-faint">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-base font-bold text-ink">{title}</h2>
      {children}
    </div>
  );
}
