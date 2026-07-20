"use client";

import { useActionState } from "react";
import { confirmSetup2faAction } from "./actions";

export function ConfirmForm() {
  const [state, action, pending] = useActionState(confirmSetup2faAction, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink" htmlFor="code">
          Код из приложения
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          pattern="\d{6}"
          autoComplete="one-time-code"
          placeholder="123456"
          required
          className="w-40 rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-center font-mono text-xl font-bold tracking-[0.3em] text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none"
        />
      </div>
      {state.error && (
        <p className="text-sm text-danger">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-[var(--radius-s)] bg-ember px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Проверяем…" : "Подтвердить и включить 2FA"}
      </button>
    </form>
  );
}
