"use client";

import { useState, useActionState } from "react";
import { updateHowToGetAction } from "../actions";
import type { ActionState } from "../actions";
import { useEventSaveRegistration } from "./EventSaveBar";

type Props = {
  eventId: string;
  initialText: string;
  initialUrl: string | null;
};

export function HowToGetSection({ eventId, initialText, initialUrl }: Props) {
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState(initialUrl ?? "");
  const action = updateHowToGetAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [bulkState, setBulkState] = useState<ActionState>({});
  const displayState = bulkState.error || bulkState.success ? bulkState : state;
  const { hideInlineSave } = useEventSaveRegistration(`howToGet-${eventId}`, async () => {
    const fd = new FormData();
    fd.set("howToGet", text);
    fd.set("howToGetUrl", url);
    const result = await updateHowToGetAction(eventId, {}, fd);
    setBulkState(result);
    return result;
  });

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        maxLength={3000}
        className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-ember"
        placeholder="Опишите, как добраться до места старта: маршруты, парковка, ориентиры…"
      />
      <div className="text-right text-xs text-ink-faint">{text.length}/3000</div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ink-soft">Ссылка «Как добраться» (карта, маршрут)</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yandex.ru/maps/… или 2GIS"
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ember"
        />
      </div>

      <form action={formAction}>
        <input type="hidden" name="howToGet" value={text} />
        <input type="hidden" name="howToGetUrl" value={url} />
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
