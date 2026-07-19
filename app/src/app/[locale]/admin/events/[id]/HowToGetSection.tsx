"use client";

import { useState, useActionState } from "react";
import { updateHowToGetAction } from "../actions";
import type { ActionState } from "../actions";

type Props = {
  eventId: string;
  initialText: string;
};

export function HowToGetSection({ eventId, initialText }: Props) {
  const [text, setText] = useState(initialText);
  const action = updateHowToGetAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

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

      <form
        action={formAction}
        onSubmit={(e) => {
          const fd = new FormData(e.currentTarget);
          fd.set("howToGet", text);
          e.preventDefault();
          formAction(fd);
        }}
      >
        <input type="hidden" name="howToGet" value={text} />
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
