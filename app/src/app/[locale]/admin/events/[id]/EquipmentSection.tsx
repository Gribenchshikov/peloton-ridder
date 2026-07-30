"use client";

import { useState, useActionState } from "react";
import { updateDistanceEquipmentAction } from "../actions";
import { EQUIPMENT_ITEMS } from "@/types/eventContent";
import type { DistanceEquipment } from "@/types/eventContent";
import type { ActionState } from "../actions";

type Distance = { id: string; name: string; km: number };
type CustomItem = { key: string; label: string };

type Props = {
  eventId: string;
  distances: Distance[];
  initialEquipment: DistanceEquipment;
};

const CATEGORIES = [...new Set(EQUIPMENT_ITEMS.map((i) => i.category))];

export function EquipmentSection({ eventId, distances, initialEquipment }: Props) {
  const [equipment, setEquipment] = useState<DistanceEquipment>(initialEquipment);
  const [activeDistId, setActiveDistId] = useState(distances[0]?.id ?? "");
  const [newItemLabel, setNewItemLabel] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const action = updateDistanceEquipmentAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  if (distances.length === 0) {
    return <p className="text-sm text-ink-faint">Сначала добавьте дистанции в разделе «Дистанции».</p>;
  }

  const distEquip = equipment[activeDistId] ?? { required: [], recommended: [], customItems: [] };
  const customItems: CustomItem[] = distEquip.customItems ?? [];

  function toggle(key: string, kind: "required" | "recommended") {
    setEquipment((prev) => {
      const current = prev[activeDistId] ?? { required: [], recommended: [], customItems: [] };
      const other = kind === "required" ? "recommended" : "required";
      const isOn = current[kind].includes(key);
      const newKind = isOn ? current[kind].filter((k) => k !== key) : [...current[kind], key];
      const newOther = current[other].filter((k) => k !== key);
      return {
        ...prev,
        [activeDistId]: {
          ...current,
          [kind]: newKind,
          [other]: newOther,
        },
      };
    });
  }

  function getState(key: string): "required" | "recommended" | "none" {
    if (distEquip.required.includes(key)) return "required";
    if (distEquip.recommended.includes(key)) return "recommended";
    return "none";
  }

  function addCustomItem() {
    const label = newItemLabel.trim();
    if (!label) return;
    const key = `custom_${Date.now()}`;
    setEquipment((prev) => {
      const current = prev[activeDistId] ?? { required: [], recommended: [], customItems: [] };
      return {
        ...prev,
        [activeDistId]: {
          ...current,
          customItems: [...(current.customItems ?? []), { key, label }],
        },
      };
    });
    setNewItemLabel("");
  }

  function startEditCustomItem(key: string, label: string) {
    setEditingKey(key);
    setEditingLabel(label);
  }

  function saveEditCustomItem() {
    if (!editingKey) return;
    const label = editingLabel.trim();
    if (!label) return;
    setEquipment((prev) => {
      const current = prev[activeDistId] ?? { required: [], recommended: [], customItems: [] };
      return {
        ...prev,
        [activeDistId]: {
          ...current,
          customItems: (current.customItems ?? []).map((i) =>
            i.key === editingKey ? { ...i, label } : i
          ),
        },
      };
    });
    setEditingKey(null);
    setEditingLabel("");
  }

  function deleteCustomItem(key: string) {
    setEquipment((prev) => {
      const current = prev[activeDistId] ?? { required: [], recommended: [], customItems: [] };
      return {
        ...prev,
        [activeDistId]: {
          required: current.required.filter((k) => k !== key),
          recommended: current.recommended.filter((k) => k !== key),
          customItems: (current.customItems ?? []).filter((i) => i.key !== key),
        },
      };
    });
  }

  function ItemRow({ itemKey, label }: { itemKey: string; label: string }) {
    const st = getState(itemKey);
    return (
      <div
        className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
          st === "required"
            ? "bg-danger/8 text-ink"
            : st === "recommended"
            ? "bg-dawn/8 text-ink"
            : "bg-surface text-ink-soft"
        }`}
      >
        <span className="flex-1">{label}</span>
        <button
          type="button"
          onClick={() => toggle(itemKey, "required")}
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
          onClick={() => toggle(itemKey, "recommended")}
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

      {/* Predefined equipment by category */}
      {CATEGORIES.map((cat) => {
        const items = EQUIPMENT_ITEMS.filter((i) => i.category === cat);
        return (
          <div key={cat}>
            <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-faint">{cat}</div>
            <div className="flex flex-col divide-y divide-border overflow-hidden rounded-[var(--radius-s)] border border-border">
              {items.map((item) => (
                <ItemRow key={item.key} itemKey={item.key} label={item.label} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Custom items */}
      <div>
        <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-faint">Своё снаряжение</div>
        {customItems.length > 0 && (
          <div className="mb-2 flex flex-col divide-y divide-border overflow-hidden rounded-[var(--radius-s)] border border-border">
            {customItems.map((item) => {
              const st = getState(item.key);
              const isEditing = editingKey === item.key;
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
                  {isEditing ? (
                    <input
                      autoFocus
                      type="text"
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      onBlur={saveEditCustomItem}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); saveEditCustomItem(); }
                        if (e.key === "Escape") { setEditingKey(null); }
                      }}
                      className="flex-1 rounded border border-ember bg-surface px-2 py-0.5 text-sm text-ink focus:outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditCustomItem(item.key, item.label)}
                      className="flex-1 text-left hover:text-ink"
                      title="Нажмите чтобы редактировать"
                    >
                      {item.label}
                      <span className="ml-1.5 text-[10px] text-ink-faint opacity-60">✏</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggle(item.key, "required")}
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
                    onClick={() => toggle(item.key, "recommended")}
                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold transition-colors ${
                      st === "recommended"
                        ? "bg-dawn text-white"
                        : "border border-border text-ink-faint hover:border-dawn hover:text-dawn"
                    }`}
                  >
                    Рекомендуемое
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCustomItem(item.key)}
                    className="shrink-0 rounded px-2 py-0.5 text-xs font-semibold text-ink-faint transition-colors hover:text-danger"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newItemLabel}
            onChange={(e) => setNewItemLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomItem();
              }
            }}
            placeholder="Название предмета снаряжения…"
            className="flex-1 rounded-[var(--radius-s)] border border-border bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ember"
          />
          <button
            type="button"
            onClick={addCustomItem}
            className="shrink-0 rounded-[var(--radius-s)] border border-border px-3 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:border-ink-soft hover:text-ink"
          >
            + Добавить
          </button>
        </div>
      </div>

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
