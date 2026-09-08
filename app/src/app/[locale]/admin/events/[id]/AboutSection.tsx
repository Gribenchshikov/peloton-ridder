"use client";

import { useState, useActionState } from "react";
import { updateAboutAction } from "../actions";
import type { ActionState } from "../actions";

type Props = {
  eventId: string;
  initialAboutText: string;
};

export function AboutSection({ eventId, initialAboutText }: Props) {
  const [aboutText, setAboutText] = useState(initialAboutText);

  const action = updateAboutAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-soft">Текст о забеге</label>
          <textarea
            name="aboutText"
            value={aboutText}
            onChange={(e) => setAboutText(e.target.value)}
            rows={6}
            maxLength={4000}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-ember"
            placeholder="Расскажите о забеге — история, особенности трассы, атмосфера…"
          />
          <div className="text-right text-xs text-ink-faint">{aboutText.length}/4000</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-50"
          >
            {pending ? "Сохранение…" : "Сохранить"}
          </button>
          {state.success && <span className="text-sm text-spruce">Сохранено</span>}
          {state.error && <span className="text-sm text-danger">Ошибка: {state.error}</span>}
        </div>
      </form>
    </div>
  );
}
