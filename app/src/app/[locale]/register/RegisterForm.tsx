"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/FormField";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { AuthSuccessCard } from "@/components/AuthSuccessCard";
import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = {};

const ERROR_KEYS: Record<string, string> = {
  email_taken: "errorEmailTaken",
  invalid: "errorInvalid",
  bot_check: "errorBotCheck",
  password_mismatch: "errorPasswordMismatch",
};

export function RegisterForm() {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  if (state.success) {
    return <AuthSuccessCard title={t("checkEmailTitle")} text={t("checkEmailText")} />;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label={t("name")} name="firstName" type="text" required />
      <FormField label={t("surname")} name="lastName" type="text" required />
      <FormField label={t("email")} name="email" type="email" required />
      <FormField label={t("city")} name="city" type="text" />
      <FormField label={t("phone")} name="phone" type="tel" />
      <FormField label={t("password")} name="password" type="password" required minLength={8} />
      <FormField label={t("confirmPassword")} name="confirmPassword" type="password" required minLength={8} />

      <TurnstileWidget error={state.error} />

      {state.error && ERROR_KEYS[state.error] && (
        <p className="text-sm text-danger">{t(ERROR_KEYS[state.error])}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
      >
        {pending ? t("submitting") : t("registerCta")}
      </button>
    </form>
  );
}
