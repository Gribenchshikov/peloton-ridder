"use client";

import { useActionState } from "react";
import { applyVolunteerAction } from "./actions";

type Event = { id: string; year: number; raceName: string };

const ERROR_MESSAGES: Record<string, string> = {
  motivation_too_short: "Расскажите подробнее о мотивации (минимум 10 символов).",
  experience_too_short: "Расскажите подробнее об опыте (минимум 10 символов).",
  strava_invalid_url: "Ссылка на Strava должна начинаться с http:// или https://.",
  already_applied: "Вы уже подавали заявку на этот забег.",
  event_not_found: "Событие не найдено.",
  unauthorized: "Необходима авторизация.",
};

export function ApplyForm({ events, preselectedEventId }: { events: Event[]; preselectedEventId?: string }) {
  const [state, action, pending] = useActionState(applyVolunteerAction, {});

  return (
    <form action={action} className="flex flex-col gap-5">
      {/* Event select */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink" htmlFor="eventId">
          Событие <span className="text-danger">*</span>
        </label>
        <select
          id="eventId"
          name="eventId"
          defaultValue={preselectedEventId ?? ""}
          required
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-sm text-ink focus:border-ember focus:outline-none"
        >
          <option value="" disabled>Выберите забег</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.raceName} {e.year}
            </option>
          ))}
        </select>
      </div>

      {/* Motivation */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink" htmlFor="motivation">
          Почему хотите стать волонтёром? <span className="text-danger">*</span>
        </label>
        <textarea
          id="motivation"
          name="motivation"
          rows={3}
          required
          minLength={10}
          placeholder="Расскажите, что вас мотивирует помогать на забегах"
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none"
        />
      </div>

      {/* Experience */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink" htmlFor="experience">
          Опыт (беговой / волонтёрский) <span className="text-danger">*</span>
        </label>
        <textarea
          id="experience"
          name="experience"
          rows={3}
          required
          minLength={10}
          placeholder="Какие забеги вы бегали, где волонтёрили раньше"
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none"
        />
      </div>

      {/* Strava (optional) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink" htmlFor="stravaUrl">
          Ссылка на Strava <span className="text-ink-faint font-normal">(необязательно)</span>
        </label>
        <input
          id="stravaUrl"
          name="stravaUrl"
          type="url"
          placeholder="https://www.strava.com/athletes/..."
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none"
        />
      </div>

      {state.error && (
        <p className="text-sm text-danger">{ERROR_MESSAGES[state.error] ?? state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-[var(--radius-s)] bg-ember px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Отправляем…" : "Подать заявку"}
      </button>
    </form>
  );
}
