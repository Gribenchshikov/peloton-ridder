"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink-soft">{t("email")}</span>
        <input
          name="email"
          type="email"
          required
          className="rounded-[var(--radius-s)] border border-border bg-stone-50 px-3 py-2.5 text-ink outline-none focus:border-ember"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink-soft">{t("password")}</span>
        <input
          name="password"
          type="password"
          required
          className="rounded-[var(--radius-s)] border border-border bg-stone-50 px-3 py-2.5 text-ink outline-none focus:border-ember"
        />
      </label>

      {state.error && <p className="text-sm text-danger">{t("errorInvalidCredentials")}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
      >
        {pending ? t("submitting") : t("loginCta")}
      </button>
    </form>
  );
}
