"use client";

import { useState, useActionState } from "react";
import { updateDistanceEquipmentAction } from "../actions";
import { EQUIPMENT_ITEMS } from "@/types/eventContent";
import type { DistanceEquipment, EquipmentKey } from "@/types/eventContent";
import type { ActionState } from "../actions";

type Distance = { id: string; name: string; km: number };

type Props = {
  eventId: string;
  distances: Distance[];
  initialEquipment: DistanceEquipment;
};

const CATEGORIES = [...new Set(EQUIPMENT_ITEMS.map((i) => i.category))];

export function EquipmentSection({ eventId, distances, initialEquipment }: Props) {
  const [equipment, setEquipment] = useState<DistanceEquipment>(initialEquipment);
  const [activeDistId, setActiveDistId] = useState(distances[0]?.id ?? "");
  const action = updateDistanceEquipmentAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  if (distances.length === 0) {
    return <p className="text-sm text-ink-faint">Сначала добавьте дистанции в разделе «Дистанции».</p>;
  }

  const distEquip = equipment[activeDistId] ?? { required: [], recommended: [] };

  function toggle(key: EquipmentKey, kind: "required" | "recommended") {
    setEquipment((prev) => {
      const current = prev[activeDistId] ?? { required: [], recommended: [] };
      const other = kind === "required" ? "recommended" : "required";
      const isOn = current[kind].includes(key);
      const newKind = isOn ? current[kind].filter((k) => k !== key) : [...current[kind], key];
      const newOther = current[other].filter((k) => k !== key);
      return { ...prev, [activeDistId]: { required: newKind, recommended: newOther } };
    });
  }

  function getState(key: EquipmentKey): "required" | "recommended" | "none" {
    if (distEquip.required.includes(key)) return "required";
    if (distEquip.recommended.includes(key)) return "recommended";
    return "none";
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Distance tabs */}
      {distances.length > 1 && (
        <div className="flex gap-1 overflow-x-auto">
          {distances.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setActiveDistId(d.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                d.id === activeDistId
                  ? "bg-ember text-white"
                  : "border border-border text-ink-soft hover:text-ink"
              }`}
            >
              {d.name} ({d.km} км)
            </button>
          ))}
        </div>
      )}
      {distances.length === 1 && (
        <div className="text-sm font-semibold text-ink">{distances[0].name} ({distances[0].km} км)</div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-ink-faint">
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-danger/80" /> Обязательное</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-dawn/70" /> Рекомендуемое</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm border border-border bg-surface" /> Не выбрано</span>
      </div>

      {/* Equipment list by category */}
      {CATEGORIES.map((cat) => {
        const items = EQUIPMENT_ITEMS.filter((i) => i.category === cat);
        return (
          <div key={cat}>
            <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-faint">{cat}</div>
            <div className="flex flex-col divide-y divide-border overflow-hidden rounded-[var(--radius-s)] border border-border">
              {items.map((item) => {
                const st = getState(item.key as EquipmentKey);
                return (
                  <div
                    key={item.key}
                    className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                      st === "required"
                        ? "bg-danger/8 text-ink"
                        : st === "recommended"
                        ? "bg-dawn/8 text-ink"
                        : "bg-surface text-ink-soft"
                    }`}
                  >
                    <span className="flex-1">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => toggle(item.key as EquipmentKey, "required")}
                      className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold transition-colors ${
                        st === "required"
                          ? "bg-danger text-white"
                          : "border border-border text-ink-faint hover:border-danger hover:text-danger"
                      }`}
                    >
                      Обязательное
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(item.key as EquipmentKey, "recommended")}
                      className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold transition-colors ${
                        st === "recommended"
                          ? "bg-dawn text-white"
                          : "border border-border text-ink-faint hover:border-dawn hover:text-dawn"
                      }`}
                    >
                      Рекомендуемое
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <form
        action={formAction}
        onSubmit={(e) => {
          const fd = new FormData(e.currentTarget);
          fd.set("distanceEquipment", JSON.stringify(equipment));
          e.preventDefault();
          formAction(fd);
        }}
      >
        <input type="hidden" name="distanceEquipment" value={JSON.stringify(equipment)} />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-50"
          >
            {pending ? "Сохранение…" : "Сохранить снаряжение"}
          </button>
          {state.success && <span className="text-sm text-spruce">Сохранено</span>}
          {state.error && <span className="text-sm text-danger">Ошибка</span>}
        </div>
      </form>
    </div>
  );
}
