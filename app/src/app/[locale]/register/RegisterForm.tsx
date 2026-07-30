"use client";

import { useState, useActionState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { FormField } from "@/components/FormField";
import { TurnstileWidget, TURNSTILE_ENABLED } from "@/components/TurnstileWidget";
import { AuthSuccessCard } from "@/components/AuthSuccessCard";
import { registerAction, type RegisterState } from "./actions";
import { googleSignInAction } from "@/app/[locale]/login/actions";
import { COUNTRIES } from "@/lib/countries";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const initialState: RegisterState = {};

const ERROR_KEYS: Record<string, string> = {
  email_taken: "errorEmailTaken",
  disposable_email: "errorDisposableEmail",
  invalid: "errorInvalid",
  name_latin_only: "errorNameLatinOnly",
  bot_check: "errorBotCheck",
  password_mismatch: "errorPasswordMismatch",
  password_weak: "errorPasswordWeak",
};

export function RegisterForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const [turnstileReady, setTurnstileReady] = useState(!TURNSTILE_ENABLED);

  if (state.success) {
    return <AuthSuccessCard title={t("checkEmailTitle")} text={t("checkEmailText")} />;
  }

  const v = state.values;

  return (
    <div className="flex flex-col gap-5">
      {/* Google */}
      <form action={googleSignInAction}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-[var(--radius-s)] border border-border bg-surface px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          <GoogleIcon />
          Зарегистрироваться через Google
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-ink-faint">или заполните форму</span>
        <div className="h-px flex-1 bg-border" />
      </div>

    <form action={formAction} className="flex flex-col gap-4">
      <FormField label={t("name")} name="firstName" type="text" required pattern="[A-Za-z][A-Za-z \-]*" title={t("errorNameLatinOnly")} defaultValue={v?.firstName} />
      <FormField label={t("surname")} name="lastName" type="text" required pattern="[A-Za-z][A-Za-z \-]*" title={t("errorNameLatinOnly")} defaultValue={v?.lastName} />
      <FormField label={t("email")} name="email" type="email" required defaultValue={v?.email} />
      <FormField label={t("city")} name="city" type="text" defaultValue={v?.city} />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink-soft">{t("country")}</span>
        <select
          name="country"
          defaultValue={v?.country ?? ""}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-ink"
        >
          <option value=""></option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {locale === "ru" || locale === "kk" ? c.name_ru : c.name_en}
            </option>
          ))}
        </select>
      </label>
      <FormField label={t("phone")} name="phone" type="tel" defaultValue={v?.phone} />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink-soft">{t("birthDate")}</span>
        <input
          type="date"
          name="birthDate"
          defaultValue={v?.birthDate}
          max={new Date().toISOString().slice(0, 10)}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-ink"
        />
      </label>
      <div className="flex flex-col gap-1.5">
        <FormField label={t("password")} name="password" type="password" required minLength={8} />
        <span className="text-xs text-ink-faint">{t("passwordHint")}</span>
      </div>
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
    </div>
  );
}
