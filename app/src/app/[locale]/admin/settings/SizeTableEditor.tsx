"use client";

import { useState, useTransition } from "react";
import { type SizeRow } from "@/types/sizeTable";
import { saveSizeTableAction } from "@/lib/settingsActions";

export function SizeTableEditor({ initialRows }: { initialRows: SizeRow[] }) {
  const [rows, setRows] = useState<SizeRow[]>(initialRows);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  function updateCell(idx: number, field: keyof SizeRow, value: string) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    if (status !== "idle") setStatus("idle");
  }

  function handleSave() {
    setStatus("saving");
    startTransition(async () => {
      const result = await saveSizeTableAction(JSON.stringify(rows));
      setStatus("ok" in result ? "saved" : "error");
    });
  }

  const cellCls = "w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-ember focus:ring-1 focus:ring-ember tabular-nums";

  return (
    <section className="rounded-[var(--radius-m)] border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-4 font-display text-lg font-bold text-ink">Таблица размеров футболок</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">
              <th className="pb-2 pr-3 w-16">Размер</th>
              <th className="pb-2 pr-3">Грудь (см)</th>
              <th className="pb-2 pr-3">Талия (см)</th>
              <th className="pb-2">Бёдра (см)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.size} className="border-b border-border last:border-0">
                <td className="py-2 pr-3 font-bold text-ink">{row.size}</td>
                <td className="py-2 pr-3">
                  <input className={cellCls} value={row.chest} onChange={(e) => updateCell(idx, "chest", e.target.value)} />
                </td>
                <td className="py-2 pr-3">
                  <input className={cellCls} value={row.waist} onChange={(e) => updateCell(idx, "waist", e.target.value)} />
                </td>
                <td className="py-2">
                  <input className={cellCls} value={row.hip} onChange={(e) => updateCell(idx, "hip", e.target.value)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-50"
        >
          {status === "saving" ? "…" : status === "saved" ? "Сохранено" : "Сохранить"}
        </button>
        {status === "error" && <span className="text-sm text-red-500">Ошибка при сохранении</span>}
      </div>
    </section>
  );
}
