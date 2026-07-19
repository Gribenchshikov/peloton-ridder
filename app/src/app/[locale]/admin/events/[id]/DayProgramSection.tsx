"use client";

import { useState, useActionState } from "react";
import { updateDayProgramAction } from "../actions";
import type { DayProgramItem } from "@/types/eventContent";
import type { ActionState } from "../actions";

type Props = {
  eventId: string;
  initialItems: DayProgramItem[];
};

export function DayProgramSection({ eventId, initialItems }: Props) {
  const [items, setItems] = useState<DayProgramItem[]>(initialItems);
  const action = updateDayProgramAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  function addItem() {
    setItems((prev) => [...prev, { time: "", description: "" }]);
  }

  function updateItem(i: number, field: keyof DayProgramItem, value: string) {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function moveUp(i: number) {
    if (i === 0) return;
    setItems((prev) => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  }

  function moveDown(i: number) {
    if (i === items.length - 1) return;
    setItems((prev) => {
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <div className="flex flex-col gap-1">
            <button type="button" onClick={() => moveUp(i)} disabled={i === 0} className="text-xs text-ink-faint hover:text-ink disabled:opacity-30">▲</button>
            <button type="button" onClick={() => moveDown(i)} disabled={i === items.length - 1} className="text-xs text-ink-faint hover:text-ink disabled:opacity-30">▼</button>
          </div>
          <input
            type="text"
            value={item.time}
            onChange={(e) => updateItem(i, "time", e.target.value)}
            maxLength={20}
            placeholder="08:00"
            className="w-20 rounded-[var(--radius-s)] border border-border bg-surface px-2 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ember"
          />
          <input
            type="text"
            value={item.description}
            onChange={(e) => updateItem(i, "description", e.target.value)}
            maxLength={500}
            placeholder="Старт первой волны"
            className="flex-1 rounded-[var(--radius-s)] border border-border bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ember"
          />
          <button type="button" onClick={() => removeItem(i)} className="text-xs text-danger hover:underline">✕</button>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="self-start rounded-[var(--radius-s)] border border-border px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-2"
      >
        + Добавить пункт
      </button>

      <form
        action={formAction}
        onSubmit={(e) => {
          const fd = new FormData(e.currentTarget);
          fd.set("dayProgram", JSON.stringify(items));
          e.preventDefault();
          formAction(fd);
        }}
      >
        <input type="hidden" name="dayProgram" value={JSON.stringify(items)} />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-50"
          >
            {pending ? "Сохранение…" : "Сохранить"}
          </button>
          {state.success && <span className="text-sm text-spruce">Сохранено</span>}
          {state.error && <span className="text-sm text-danger">Ошибка</span>}
        </div>
      </form>
    </div>
  );
}
