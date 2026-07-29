"use client";

import { useState, useTransition } from "react";
import { saveHomeStatsAction, type StatItem } from "@/lib/settingsActions";

const DEFAULT_STATS: StatItem[] = [
  { value: "4", label: "старта за сезон" },
  { value: "7-й", label: "год клуба (с 2019)" },
  { value: "1 200+", label: "участников в сезоне" },
  { value: "3", label: "дистанции на каждом старте" },
];

export function HomeStatsEditor({ initial }: { initial: StatItem[] }) {
  const [stats, setStats] = useState<StatItem[]>(
    initial.length === 4 ? initial : DEFAULT_STATS,
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  function update(index: number, field: "value" | "label", val: string) {
    setStats((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: val } : s)));
    setStatus("idle");
  }

  function handleSave() {
    setStatus("saving");
    startTransition(async () => {
      const result = await saveHomeStatsAction(stats);
      setStatus("error" in result ? "error" : "saved");
    });
  }

  return (
    <section className="rounded-[var(--radius-m)] border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-4 font-display text-lg font-bold text-ink">Статистика на главной</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stats.map((stat, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-[var(--radius-s)] border border-border p-3">
            <input
              value={stat.value}
              onChange={(e) => update(i, "value", e.target.value)}
              placeholder="Значение (напр. «1 200+»)"
              className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm font-bold text-ink focus:border-ember focus:outline-none"
            />
            <input
              value={stat.label}
              onChange={(e) => update(i, "label", e.target.value)}
              placeholder="Подпись"
              className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink-soft focus:border-ember focus:outline-none"
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-[var(--radius-s)] bg-ember px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 hover:bg-ember-strong"
        >
          {status === "saving" ? "Сохраняем…" : "Сохранить"}
        </button>
        {status === "saved" && <span className="text-sm text-spruce">Сохранено ✓</span>}
        {status === "error" && <span className="text-sm text-danger">Ошибка при сохранении</span>}
      </div>
    </section>
  );
}
