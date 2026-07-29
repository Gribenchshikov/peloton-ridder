"use client";

import { useActionState } from "react";
import { sendContactAction } from "./actions";

const ERRORS: Record<string, string> = {
  invalid_name: "Введите ваше имя (минимум 2 символа).",
  invalid_email: "Введите корректный email.",
  message_too_short: "Сообщение слишком короткое (минимум 10 символов).",
};

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContactAction, {});

  if (state.success) {
    return (
      <div className="rounded-[var(--radius-m)] border border-spruce/30 bg-spruce/5 p-6 text-center">
        <p className="text-lg font-semibold text-spruce">Сообщение отправлено ✓</p>
        <p className="mt-2 text-sm text-ink-soft">Мы ответим вам в ближайшее время.</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink-soft">
          Имя <span className="text-danger">*</span>
        </span>
        <input
          name="name"
          type="text"
          required
          minLength={2}
          placeholder="Иван Иванов"
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink-soft">
          Email <span className="text-danger">*</span>
        </span>
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink-soft">Телефон <span className="text-xs font-normal text-ink-faint">(необязательно)</span></span>
        <input
          name="phone"
          type="tel"
          placeholder="+7 700 000 0000"
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink-soft">Тема <span className="text-xs font-normal text-ink-faint">(необязательно)</span></span>
        <input
          name="subject"
          type="text"
          placeholder="Вопрос об участии"
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink-soft">
          Сообщение <span className="text-danger">*</span>
        </span>
        <textarea
          name="message"
          rows={5}
          required
          minLength={10}
          placeholder="Напишите ваш вопрос или предложение…"
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none"
        />
      </label>

      {state.error && (
        <p className="text-sm text-danger">{ERRORS[state.error] ?? state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-[var(--radius-s)] bg-ember px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Отправляем…" : "Отправить сообщение"}
      </button>
    </form>
  );
}
