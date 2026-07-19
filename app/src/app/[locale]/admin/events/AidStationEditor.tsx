"use client";

import { useState, useTransition } from "react";
import { updateAidStationsAction, updateRaceStartAction } from "./actions";
import type { AidStation, AidStationType } from "@/types/aidStation";

type Props = {
  distanceId: string;
  initialStations: AidStation[];
  initialRaceStartMinutes: number | null;
};

const TYPE_LABELS: Record<AidStationType, string> = {
  water: "💧 Вода",
  food: "🍌 Питание",
  checkpoint: "🏁 КП",
};

const emptyNew = { name: "", km: "", type: "water" as AidStationType, cutoffMinutes: "" };

function minutesToTime(m: number): string {
  return `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
}

function timeToMinutes(t: string): number | null {
  const [h, min] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(min)) return null;
  return h * 60 + min;
}

function absoluteTime(raceStartMinutes: number, cutoffMinutes: number): string {
  const total = raceStartMinutes + cutoffMinutes;
  const day = Math.floor(total / 1440);
  const mins = total % 1440;
  const time = minutesToTime(mins);
  return day > 0 ? `${time} (+${day}д)` : time;
}

export function AidStationEditor({ distanceId, initialStations, initialRaceStartMinutes }: Props) {
  const [stations, setStations] = useState<AidStation[]>(initialStations);
  const [startTime, setStartTime] = useState(
    initialRaceStartMinutes != null ? minutesToTime(initialRaceStartMinutes) : ""
  );
  const [stationsStatus, setStationsStatus] = useState<{ error?: string; success?: boolean }>({});
  const [startStatus, setStartStatus] = useState<{ error?: string; success?: boolean }>({});
  const [stationsPending, startStationsTransition] = useTransition();
  const [startPending, startStartTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [newS, setNewS] = useState(emptyNew);

  const raceStartMins = timeToMinutes(startTime);

  function addStation() {
    const km = parseFloat(newS.km);
    if (!newS.name.trim() || isNaN(km)) return;
    const cutoff = newS.cutoffMinutes !== "" ? parseInt(newS.cutoffMinutes) : undefined;
    const s: AidStation = { name: newS.name.trim(), km, type: newS.type, ...(cutoff != null ? { cutoffMinutes: cutoff } : {}) };
    setStations((prev) => [...prev, s].sort((a, b) => a.km - b.km));
    setNewS(emptyNew);
    setAdding(false);
    setStationsStatus({});
  }

  function removeStation(index: number) {
    setStations((prev) => prev.filter((_, i) => i !== index));
    setStationsStatus({});
  }

  function saveStations() {
    const fd = new FormData();
    fd.set("aidStations", JSON.stringify(stations));
    setStationsStatus({});
    startStationsTransition(async () => {
      const result = await updateAidStationsAction(distanceId, {}, fd);
      setStationsStatus(result);
    });
  }

  function saveStartTime() {
    const fd = new FormData();
    fd.set("raceStartMinutes", raceStartMins != null ? String(raceStartMins) : "");
    setStartStatus({});
    startStartTransition(async () => {
      const result = await updateRaceStartAction(distanceId, {}, fd);
      setStartStatus(result);
    });
  }

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-3 mt-1">
      {/* Start time */}
      <div className="flex flex-col gap-2">
        <div className="text-xs font-bold uppercase tracking-wide text-ink-faint">Старт дистанции</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="time"
            value={startTime}
            onChange={(e) => { setStartTime(e.target.value); setStartStatus({}); }}
            className="rounded border border-border bg-surface px-2 py-1.5 text-sm tabular-nums focus:border-ember focus:outline-none"
          />
          <button
            type="button"
            onClick={saveStartTime}
            disabled={startPending}
            className="rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-ink-soft disabled:opacity-50"
          >
            {startPending ? "…" : "Сохранить старт"}
          </button>
          {startStatus.success && <span className="text-sm text-spruce">Сохранено ✓</span>}
          {startStatus.error && <span className="text-sm text-danger">Ошибка</span>}
        </div>
      </div>

      {/* Aid stations */}
      <div className="flex flex-col gap-2">
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
                    {raceStartMins != null
                      ? absoluteTime(raceStartMins, s.cutoffMinutes)
                      : `+${Math.floor(s.cutoffMinutes / 60)}:${(s.cutoffMinutes % 60).toString().padStart(2, "0")}`
                    }
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
              <input type="number" step="0.1" placeholder="12.5" value={newS.km}
                onChange={(e) => setNewS((p) => ({ ...p, km: e.target.value }))}
                className="w-20 rounded border border-border bg-surface px-2 py-1.5 text-sm focus:border-ember focus:outline-none" />
            </div>
            <div className="flex min-w-36 flex-1 flex-col gap-1">
              <label className="text-xs text-ink-faint">Название</label>
              <input type="text" placeholder="ПП Кедр" value={newS.name}
                onChange={(e) => setNewS((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm focus:border-ember focus:outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-faint">Тип</label>
              <select value={newS.type} onChange={(e) => setNewS((p) => ({ ...p, type: e.target.value as AidStationType }))}
                className="rounded border border-border bg-surface px-2 py-1.5 text-sm focus:border-ember focus:outline-none">
                <option value="water">💧 Вода</option>
                <option value="food">🍌 Питание</option>
                <option value="checkpoint">🏁 КП</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-faint">Кат-офф (мин от старта)</label>
              <input type="number" placeholder="180" value={newS.cutoffMinutes}
                onChange={(e) => setNewS((p) => ({ ...p, cutoffMinutes: e.target.value }))}
                className="w-32 rounded border border-border bg-surface px-2 py-1.5 text-sm focus:border-ember focus:outline-none" />
            </div>
            <button type="button" onClick={addStation}
              className="rounded-[var(--radius-s)] bg-ember px-3 py-1.5 text-sm font-semibold text-white hover:bg-ember-strong">
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
          <button type="button" onClick={saveStations} disabled={stationsPending}
            className="rounded-[var(--radius-s)] border border-border bg-surface-2 px-4 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-ink-soft disabled:opacity-50">
            {stationsPending ? "Сохраняется…" : "Сохранить пункты"}
          </button>
          {stationsStatus.success && <span className="text-sm text-spruce">Сохранено ✓</span>}
          {stationsStatus.error && <span className="text-sm text-danger">Ошибка</span>}
        </div>
      </div>
    </div>
  );
}
