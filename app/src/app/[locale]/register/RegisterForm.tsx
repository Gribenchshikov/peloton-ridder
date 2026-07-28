"use client";

import { useState, useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/FormField";
import { TurnstileWidget, TURNSTILE_ENABLED } from "@/components/TurnstileWidget";
import { AuthSuccessCard } from "@/components/AuthSuccessCard";
import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = {};

const ERROR_KEYS: Record<string, string> = {
  email_taken: "errorEmailTaken",
  invalid: "errorInvalid",
  name_latin_only: "errorNameLatinOnly",
  bot_check: "errorBotCheck",
  password_mismatch: "errorPasswordMismatch",
};

export function RegisterForm() {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const [turnstileReady, setTurnstileReady] = useState(!TURNSTILE_ENABLED);

  if (state.success) {
    return <AuthSuccessCard title={t("checkEmailTitle")} text={t("checkEmailText")} />;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label={t("name")} name="firstName" type="text" required pattern="[A-Za-z][A-Za-z \-]*" title={t("errorNameLatinOnly")} />
      <FormField label={t("surname")} name="lastName" type="text" required pattern="[A-Za-z][A-Za-z \-]*" title={t("errorNameLatinOnly")} />
      <FormField label={t("email")} name="email" type="email" required />
      <FormField label={t("city")} name="city" type="text" />
      <FormField label={t("phone")} name="phone" type="tel" />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink-soft">{t("birthDate")}</span>
        <input
          type="date"
          name="birthDate"
          max={new Date().toISOString().slice(0, 10)}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-ink"
        />
      </label>
      <FormField label={t("password")} name="password" type="password" required minLength={8} />
      <FormField label={t("confirmPassword")} name="confirmPassword" type="password" required minLength={8} />

      <TurnstileWidget error={state.error} onReadyChange={setTurnstileReady} />

      {state.error && ERROR_KEYS[state.error] && (
        <p className="text-sm text-danger">{t(ERROR_KEYS[state.error])}</p>
      )}

      <button
        type="submit"
        disabled={pending || !turnstileReady}
        className="mt-2 rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
      >
        {pending ? t("submitting") : t("registerCta")}
      </button>
    </form>
  );
}
