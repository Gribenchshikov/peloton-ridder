"use client";

import { useState, useActionState } from "react";
import { toggleRegistrationsAction } from "./actions";

export function RegistrationToggle({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [showModal, setShowModal] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: { error?: string; open?: boolean }, formData: FormData) => {
      const result = await toggleRegistrationsAction(prev, formData);
      if (result.open !== undefined) {
        setOpen(result.open);
        setShowModal(false);
      }
      return result;
    },
    {}
  );

  return (
    <>
      <section className="rounded-[var(--radius-m)] border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Регистрация участников</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {open
                ? "Регистрация открыта — участники могут записываться на забеги"
                : "Регистрация закрыта — форма записи недоступна для всех участников"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember ${
              open ? "bg-ember" : "bg-ink-soft/40"
            }`}
            role="switch"
            aria-checked={open}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                open ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4">
          <div className="w-full max-w-sm rounded-[var(--radius-m)] border border-border bg-surface p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-ink">
              {open ? "Закрыть регистрацию?" : "Открыть регистрацию?"}
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              Введите 6-значный код из приложения-аутентификатора для подтверждения.
            </p>
            <form action={action} className="mt-5 flex flex-col gap-4">
              <input
                name="totpCode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                pattern="\d{6}"
                autoComplete="one-time-code"
                placeholder="123456"
                autoFocus
                required
                className="w-full rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-center font-mono text-xl font-bold tracking-[0.3em] text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none"
              />
              {state.error && <p className="text-sm text-danger">{state.error}</p>}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 rounded-[var(--radius-s)] bg-ember px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {pending ? "Проверяем…" : "Подтвердить"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-[var(--radius-s)] border border-border px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-2"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
