"use client";

import { useActionState, useState } from "react";
import { togglePublishedAction } from "./publishAction";

export function PublishToggle({ eventId, initialIsPublished }: { eventId: string; initialIsPublished: boolean }) {
  const [showModal, setShowModal] = useState(false);
  const [targetPublish, setTargetPublish] = useState(false);
  const [isPublished, setIsPublished] = useState(initialIsPublished);

  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string }, formData: FormData) => {
      const result = await togglePublishedAction(eventId, prev, formData);
      if (result.ok && result.isPublished !== undefined) {
        setIsPublished(result.isPublished);
        setShowModal(false);
      }
      return result;
    },
    {}
  );

  function openModal(publish: boolean) {
    setTargetPublish(publish);
    setShowModal(true);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-ink">Публикация события</div>
          <div className="mt-0.5 text-xs text-ink-soft">
            {isPublished
              ? "Событие отображается на сайте для всех посетителей."
              : "Событие скрыто — видно только в админке."}
          </div>
        </div>
        <button
          type="button"
          onClick={() => openModal(!isPublished)}
          disabled={pending}
          className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors disabled:opacity-50 ${
            isPublished
              ? "bg-spruce/10 text-spruce hover:bg-spruce/20"
              : "bg-ember/10 text-ember hover:bg-ember/20"
          }`}
        >
          {isPublished ? "Скрыть" : "Опубликовать"}
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            action={formAction}
            className="w-full max-w-sm rounded-[var(--radius-m)] border border-border bg-surface p-6 shadow-xl"
          >
            <input type="hidden" name="publish" value={targetPublish ? "1" : "0"} />
            <h2 className="font-display text-lg font-bold text-ink">
              {targetPublish ? "Опубликовать событие?" : "Скрыть событие?"}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {targetPublish
                ? "После публикации событие появится на сайте. Подтвердите действие кодом из приложения."
                : "Событие будет скрыто с сайта. Существующие регистрации сохранятся."}
            </p>
            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink">Код 2FA</label>
              <input
                name="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                pattern="\d{6}"
                autoComplete="one-time-code"
                required
                autoFocus
                placeholder="123456"
                className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-center font-mono text-xl font-bold tracking-[0.3em] text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none"
              />
            </div>
            {state.error === "invalid_code" && (
              <p className="mt-2 text-sm text-danger">Неверный код 2FA</p>
            )}
            {state.error === "no_2fa" && (
              <p className="mt-2 text-sm text-danger">Сначала настройте 2FA в /admin/setup-2fa</p>
            )}
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-2"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white hover:bg-ember-strong disabled:opacity-50"
              >
                {pending ? "Проверяем…" : "Подтвердить"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
