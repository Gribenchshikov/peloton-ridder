"use client";

import { useActionState } from "react";
import { sendNotificationAction, type NotifyState } from "./notifyActions";

const initialState: NotifyState = {};

export function NotifySection({ eventId, lastNotification }: {
  eventId: string;
  lastNotification?: { subject: string; sentAt: Date } | null;
}) {
  const boundAction = sendNotificationAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-lg font-bold text-ink">Рассылка участникам</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Письмо получат все участники со статусом «Оплачено».
        </p>
        {lastNotification && state.count === undefined && (
          <p className="mt-1 text-xs text-ink-faint">
            Последняя рассылка:{" "}
            <span className="font-medium text-ink-soft">«{lastNotification.subject}»</span>{" "}
            —{" "}
            {new Intl.DateTimeFormat("ru", { dateStyle: "short", timeStyle: "short" }).format(
              new Date(lastNotification.sentAt)
            )}
          </p>
        )}
      </div>

      {state.count !== undefined ? (
        <div className="rounded-[var(--radius-m)] border border-spruce/30 bg-spruce/5 p-4 text-sm text-spruce">
          ✓ Отправлено {state.count} участникам
        </div>
      ) : (
        <form
          action={formAction}
          className="flex flex-col gap-4 rounded-[var(--radius-m)] border border-border bg-surface p-5"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink-soft">Тема письма</label>
            <input
              name="subject"
              required
              minLength={3}
              maxLength={200}
              disabled={pending}
              placeholder="Panorama Fall Run 2026 — важная информация"
              className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none disabled:opacity-60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink-soft">Текст письма</label>
            <textarea
              name="body"
              required
              minLength={10}
              maxLength={10000}
              rows={7}
              disabled={pending}
              placeholder="Здесь текст сообщения..."
              className="resize-y rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none disabled:opacity-60"
            />
            <p className="text-xs text-ink-faint">Перенос строки сохраняется. HTML не поддерживается.</p>
          </div>

          {state.error && (
            <p className="text-sm text-danger">
              {state.error === "unauthorized" ? "Нет доступа" : "Проверьте тему и текст (мин. 3 и 10 символов)"}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
          >
            {pending ? "Отправляем..." : "Отправить рассылку →"}
          </button>
        </form>
      )}
    </section>
  );
}
