"use client";

import { useMemo, useState, useTransition } from "react";
import type { CancelReason } from "@/generated/prisma/client";
import { saveEventFinancials } from "./actions";
import type { FinancialData, LineEntry, PackItem } from "./actions";

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
  eventId?: string;
  initialFinancials: FinancialData | null;
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

function nextId() {
  return Math.random().toString(36).slice(2);
}

export function ReportsView({ registrations, distances, merch, selectedEventName, eventId, initialFinancials }: Props) {
  void selectedEventName;
  const paid = useMemo(() => registrations.filter((r) => r.status === "PAID"), [registrations]);
  const reserved = useMemo(() => registrations.filter((r) => r.status === "RESERVED"), [registrations]);
  const cancelled = useMemo(() => registrations.filter((r) => r.status === "CANCELLED"), [registrations]);

  const grossRevenue = useMemo(() => paid.reduce((s, r) => s + (r.distance?.price ?? 0), 0), [paid]);
  const totalDiscounts = useMemo(() => paid.reduce((s, r) => s + r.discountAmount, 0), [paid]);
  const netRevenue = grossRevenue - totalDiscounts;

  // By distance breakdown with id
  const byDistance = useMemo(() => {
    const map = new Map<string, { id: string; name: string; km: number; paid: number; reserved: number; gross: number; discounts: number }>();
    for (const r of registrations) {
      const key = r.distance?.id ?? "__transfer__";
      const existing = map.get(key) ?? { id: key, name: r.distance?.name ?? "Трансфер", km: r.distance?.km ?? 0, paid: 0, reserved: 0, gross: 0, discounts: 0 };
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

      {/* Financial report (only when event is selected) */}
      {eventId && (
        <FinancialSection
          eventId={eventId}
          distanceRows={byDistance.filter((d) => d.id !== "__transfer__").map((d) => ({ id: d.id, name: d.name, km: d.km, paid: d.paid }))}
          netRevenue={netRevenue}
          initialData={initialFinancials}
        />
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

// ── Financial Section ─────────────────────────────────────────────────────────

function FinancialSection({
  eventId,
  distanceRows,
  netRevenue,
  initialData,
}: {
  eventId: string;
  distanceRows: { id: string; name: string; km: number; paid: number }[];
  netRevenue: number;
  initialData: FinancialData | null;
}) {
  const totalPaid = distanceRows.reduce((s, d) => s + d.paid, 0);

  const [packItems, setPackItems] = useState<PackItem[]>(initialData?.packItems ?? []);
  const [expenses, setExpenses] = useState<LineEntry[]>(initialData?.expenses ?? []);
  const [incomes, setIncomes] = useState<LineEntry[]>(initialData?.incomes ?? []);
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const perPersonCost = packItems.reduce((s, i) => s + i.price, 0);
  const totalPackCost = perPersonCost * totalPaid;
  const totalExtraExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIncomes = incomes.reduce((s, i) => s + i.amount, 0);
  const totalCosts = totalPackCost + totalExtraExpenses;
  const profit = netRevenue - totalCosts + totalIncomes;

  function addPackItem() {
    setPackItems((prev) => [...prev, { id: nextId(), name: "", price: 0 }]);
  }
  function updatePackItem(id: string, field: "name" | "price", value: string | number) {
    setPackItems((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i));
  }
  function removePackItem(id: string) {
    setPackItems((prev) => prev.filter((i) => i.id !== id));
  }

  function addExpense() {
    setExpenses((prev) => [...prev, { id: nextId(), label: "", amount: 0 }]);
  }
  function updateExpense(id: string, field: "label" | "amount", value: string | number) {
    setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, [field]: value } : e));
  }
  function removeExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  function addIncome() {
    setIncomes((prev) => [...prev, { id: nextId(), label: "", amount: 0 }]);
  }
  function updateIncome(id: string, field: "label" | "amount", value: string | number) {
    setIncomes((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i));
  }
  function removeIncome(id: string) {
    setIncomes((prev) => prev.filter((i) => i.id !== id));
  }

  function save() {
    startTransition(async () => {
      await saveEventFinancials(eventId, { packItems, expenses, incomes });
      setSavedAt(Date.now());
    });
  }

  return (
    <Section title="Финансовый отчёт">
      <div className="flex flex-col gap-6">

        {/* Стартовый пакет */}
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Стартовый пакет (мерч + медали)
          </p>
          <p className="mb-3 text-xs text-ink-faint">
            Позиции ниже умножаются на кол-во оплаченных участников ({totalPaid} чел.)
          </p>
          <div className="flex flex-col gap-2">
            {packItems.length > 0 && (
              <div className="flex items-center gap-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                <span className="flex-1">Позиция</span>
                <span className="w-36 text-right">Цена за 1 уч. (₸)</span>
                <span className="w-5" />
              </div>
            )}
            {packItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Медаль, футболка, мешок…"
                  value={item.name}
                  onChange={(e) => updatePackItem(item.id, "name", e.target.value)}
                  className="flex-1 rounded border border-border bg-surface px-3 py-1.5 text-sm text-ink focus:border-ember focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={item.price}
                  onChange={(e) => updatePackItem(item.id, "price", Number(e.target.value))}
                  className="w-36 rounded border border-border bg-surface px-3 py-1.5 text-right text-sm tabular-nums text-ink focus:border-ember focus:outline-none"
                />
                <button
                  onClick={() => removePackItem(item.id)}
                  className="shrink-0 text-sm text-ink-faint hover:text-danger"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={addPackItem}
              className="self-start text-sm font-semibold text-ember hover:underline"
            >
              + Добавить позицию
            </button>
          </div>

          {packItems.length > 0 && totalPaid > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-[var(--radius-s)] border border-border bg-surface-2 px-4 py-2.5 text-sm">
              <span className="text-ink-soft">
                {kzt(perPersonCost)} / уч. × {totalPaid} участников
              </span>
              <span className="tabular-nums font-bold text-ink">{kzt(totalPackCost)}</span>
            </div>
          )}
        </div>

        {/* Extra expenses */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Доп. расходы</p>
          <div className="flex flex-col gap-2">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Описание расхода"
                  value={e.label}
                  onChange={(ev) => updateExpense(e.id, "label", ev.target.value)}
                  className="flex-1 rounded border border-border bg-surface px-3 py-1.5 text-sm text-ink focus:border-ember focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Сумма"
                  value={e.amount}
                  onChange={(ev) => updateExpense(e.id, "amount", Number(ev.target.value))}
                  className="w-36 rounded border border-border bg-surface px-3 py-1.5 text-right text-sm tabular-nums text-ink focus:border-ember focus:outline-none"
                />
                <button
                  onClick={() => removeExpense(e.id)}
                  className="shrink-0 text-sm text-ink-faint hover:text-danger"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={addExpense}
              className="self-start text-sm font-semibold text-ember hover:underline"
            >
              + Добавить расход
            </button>
          </div>
        </div>

        {/* Extra incomes */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Доп. доходы (спонсоры, гранты)</p>
          <div className="flex flex-col gap-2">
            {incomes.map((i) => (
              <div key={i.id} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Источник дохода"
                  value={i.label}
                  onChange={(ev) => updateIncome(i.id, "label", ev.target.value)}
                  className="flex-1 rounded border border-border bg-surface px-3 py-1.5 text-sm text-ink focus:border-ember focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Сумма"
                  value={i.amount}
                  onChange={(ev) => updateIncome(i.id, "amount", Number(ev.target.value))}
                  className="w-36 rounded border border-border bg-surface px-3 py-1.5 text-right text-sm tabular-nums text-ink focus:border-ember focus:outline-none"
                />
                <button
                  onClick={() => removeIncome(i.id)}
                  className="shrink-0 text-sm text-ink-faint hover:text-danger"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={addIncome}
              className="self-start text-sm font-semibold text-ember hover:underline"
            >
              + Добавить доход
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-[var(--radius-m)] border border-border bg-surface p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-faint">Итоговый расчёт</p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-soft">Чистая выручка (оплачено − скидки)</span>
              <span className="tabular-nums font-semibold text-ink">{kzt(netRevenue)}</span>
            </div>
            {totalPackCost > 0 && (
              <div className="flex justify-between">
                <span className="text-ink-soft">− Стартовый пакет</span>
                <span className="tabular-nums text-danger">−{kzt(totalPackCost)}</span>
              </div>
            )}
            {expenses.map((e) => e.amount > 0 && (
              <div key={e.id} className="flex justify-between">
                <span className="text-ink-soft">− {e.label || "Расход"}</span>
                <span className="tabular-nums text-danger">−{kzt(e.amount)}</span>
              </div>
            ))}
            {incomes.map((i) => i.amount > 0 && (
              <div key={i.id} className="flex justify-between">
                <span className="text-ink-soft">+ {i.label || "Доход"}</span>
                <span className="tabular-nums text-spruce">+{kzt(i.amount)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-border pt-3">
              <span className="font-semibold text-ink">Реальный доход</span>
              <span className={`text-lg tabular-nums font-bold ${profit >= 0 ? "text-spruce" : "text-danger"}`}>{kzt(profit)}</span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={isPending}
            className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50 hover:opacity-90"
          >
            {isPending ? "Сохранение…" : "Сохранить"}
          </button>
          {savedAt && (
            <span className="text-sm text-spruce">Сохранено ✓</span>
          )}
        </div>
      </div>
    </Section>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

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
