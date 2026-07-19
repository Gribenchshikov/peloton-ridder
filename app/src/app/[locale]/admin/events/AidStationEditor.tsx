"use client";

import { useState, useTransition } from "react";
import { updateAidStationsAction } from "./actions";
import type { AidStation, AidStationType } from "@/types/aidStation";

type Props = {
  distanceId: string;
  initialStations: AidStation[];
};

const TYPE_LABELS: Record<AidStationType, string> = {
  water: "💧 Вода",
  food: "🍌 Питание",
  checkpoint: "🏁 КП",
};

const emptyNew = { name: "", km: "", type: "water" as AidStationType, cutoffMinutes: "" };

export function AidStationEditor({ distanceId, initialStations }: Props) {
  const [stations, setStations] = useState<AidStation[]>(initialStations);
  const [status, setStatus] = useState<{ error?: string; success?: boolean }>({});
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [newS, setNewS] = useState(emptyNew);

  function addStation() {
    const km = parseFloat(newS.km);
    if (!newS.name.trim() || isNaN(km)) return;
    const cutoff = newS.cutoffMinutes !== "" ? parseInt(newS.cutoffMinutes) : undefined;
    const s: AidStation = { name: newS.name.trim(), km, type: newS.type, ...(cutoff != null ? { cutoffMinutes: cutoff } : {}) };
    setStations((prev) => [...prev, s].sort((a, b) => a.km - b.km));
    setNewS(emptyNew);
    setAdding(false);
    setStatus({});
  }

  function removeStation(index: number) {
    setStations((prev) => prev.filter((_, i) => i !== index));
    setStatus({});
  }

  function save() {
    const fd = new FormData();
    fd.set("aidStations", JSON.stringify(stations));
    setStatus({});
    startTransition(async () => {
      const result = await updateAidStationsAction(distanceId, {}, fd);
      setStatus(result);
    });
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3 mt-1">
      <div className="text-xs font-bold uppercase tracking-wide text-ink-faint">Пункты питания</div>

      {stations.length > 0 && (
        <div className="flex flex-col gap-1">
          {stations.map((s, i) => (
            <div key={i} className="flex items-center gap-2 rounded-[var(--radius-s)] bg-surface-2 px-3 py-1.5 text-sm">
              <span className="w-14 shrink-0 tabular-nums text-ink-faint">{s.km} км</span>
              <span className="flex-1 font-medium text-ink">{s.name}</span>
              <span className="shrink-0 text-ink-soft">{TYPE_LABELS[s.type]}</span>
              {s.cutoffMinutes != null && (
                <span className="shrink-0 tabular-nums text-ink-faint">
                  {Math.floor(s.cutoffMinutes / 60)}:{(s.cutoffMinutes % 60).toString().padStart(2, "0")}
                </span>
              )}
              <button type="button" onClick={() => removeStation(i)} className="shrink-0 text-xs text-danger hover:underline">✕</button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="flex flex-wrap items-end gap-2 rounded-[var(--radius-s)] border border-dashed border-border p-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink-faint">км</label>
            <input
              type="number"
              step="0.1"
              placeholder="12.5"
              value={newS.km}
              onChange={(e) => setNewS((p) => ({ ...p, km: e.target.value }))}
              className="w-20 rounded border border-border bg-surface px-2 py-1.5 text-sm focus:border-ember focus:outline-none"
            />
          </div>
          <div className="flex min-w-36 flex-1 flex-col gap-1">
            <label className="text-xs text-ink-faint">Название</label>
            <input
              type="text"
              placeholder="ПП Кедр"
              value={newS.name}
              onChange={(e) => setNewS((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm focus:border-ember focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink-faint">Тип</label>
            <select
              value={newS.type}
              onChange={(e) => setNewS((p) => ({ ...p, type: e.target.value as AidStationType }))}
              className="rounded border border-border bg-surface px-2 py-1.5 text-sm focus:border-ember focus:outline-none"
            >
              <option value="water">💧 Вода</option>
              <option value="food">🍌 Питание</option>
              <option value="checkpoint">🏁 КП</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink-faint">Кат-офф (мин)</label>
            <input
              type="number"
              placeholder="360"
              value={newS.cutoffMinutes}
              onChange={(e) => setNewS((p) => ({ ...p, cutoffMinutes: e.target.value }))}
              className="w-24 rounded border border-border bg-surface px-2 py-1.5 text-sm focus:border-ember focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={addStation}
            className="rounded-[var(--radius-s)] bg-ember px-3 py-1.5 text-sm font-semibold text-white hover:bg-ember-strong"
          >
            Добавить
          </button>
          <button type="button" onClick={() => { setAdding(false); setNewS(emptyNew); }} className="text-sm text-ink-faint hover:text-ink">
            Отмена
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="self-start text-sm font-semibold text-ink-soft hover:text-ink">
          + Добавить пункт питания
        </button>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-[var(--radius-s)] bg-surface-2 border border-border px-4 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-ink-soft disabled:opacity-50"
        >
          {isPending ? "Сохраняется…" : "Сохранить пункты"}
        </button>
        {status.success && <span className="text-sm text-spruce">Сохранено ✓</span>}
        {status.error && <span className="text-sm text-danger">Ошибка: {status.error}</span>}
      </div>
    </div>
  );
}
