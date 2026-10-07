"use client";

import { useState, useActionState } from "react";
import { updateDayProgramAction } from "../actions";
import type { DayProgramItem } from "@/types/eventContent";
import type { ActionState } from "../actions";
import { useEventSaveRegistration } from "./EventSaveBar";

type Props = {
  eventId: string;
  initialItems: DayProgramItem[];
};

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, m) => String(m).padStart(2, "0"));

function parseTime(value: string): { hour: string; minute: string } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return { hour: "", minute: "" };
  const hourNum = Number(match[1]);
  const minuteNum = Number(match[2]);
  if (hourNum > 23 || minuteNum > 59) return { hour: "", minute: "" };
  return { hour: String(hourNum).padStart(2, "0"), minute: String(minuteNum).padStart(2, "0") };
}

function TimeSelect({ value, onChange }: { value: string; onChange: (time: string) => void }) {
  const { hour, minute } = parseTime(value);

  return (
    <div className="flex items-center gap-1">
      <select
        value={hour}
        onChange={(e) => {
          const nextHour = e.target.value;
          onChange(nextHour ? `${nextHour}:${minute || "00"}` : "");
        }}
        aria-label="Часы"
        className="w-[4.5rem] rounded-[var(--radius-s)] border border-border bg-surface px-1.5 py-1.5 text-sm tabular-nums text-ink focus:outline-none focus:ring-1 focus:ring-ember"
      >
        <option value="">чч</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-sm font-semibold text-ink-faint">:</span>
      <select
        value={minute}
        onChange={(e) => {
          const nextMinute = e.target.value;
          onChange(nextMinute ? `${hour || "00"}:${nextMinute}` : hour ? `${hour}:00` : "");
        }}
        aria-label="Минуты"
        className="w-[4.5rem] rounded-[var(--radius-s)] border border-border bg-surface px-1.5 py-1.5 text-sm tabular-nums text-ink focus:outline-none focus:ring-1 focus:ring-ember"
      >
        <option value="">мм</option>
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DayProgramSection({ eventId, initialItems }: Props) {
  const [items, setItems] = useState<DayProgramItem[]>(initialItems);
  const action = updateDayProgramAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [bulkState, setBulkState] = useState<ActionState>({});
  const displayState = bulkState.error || bulkState.success ? bulkState : state;
  const { hideInlineSave } = useEventSaveRegistration(`dayProgram-${eventId}`, async () => {
    const fd = new FormData();
    fd.set("dayProgram", JSON.stringify(items.filter((item) => item.time.trim() || item.description.trim())));
    const result = await updateDayProgramAction(eventId, {}, fd);
    setBulkState(result);
    return result;
  });

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
          <TimeSelect value={item.time} onChange={(time) => updateItem(i, "time", time)} />
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
          {!hideInlineSave && (
          <button
            type="submit"
            disabled={pending}
            className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-50"
          >
            {pending ? "Сохранение…" : "Сохранить"}
          </button>
          )}
          {displayState.success && <span className="text-sm text-spruce">Сохранено</span>}
          {displayState.error && <span className="text-sm text-danger">Ошибка</span>}
        </div>
      </form>
    </div>
  );
}
