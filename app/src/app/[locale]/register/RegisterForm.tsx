"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = {};

export function RegisterForm() {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  if (state.success) {
    return (
      <div className="rounded-[var(--radius-l)] border border-border bg-surface p-6 text-center">
        <h2 className="font-display text-xl font-bold text-ink">{t("checkEmailTitle")}</h2>
        <p className="mt-2 text-sm text-ink-soft">{t("checkEmailText")}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label={t("name")} name="name" type="text" required />
      <Field label={t("email")} name="email" type="email" required />
      <Field label={t("city")} name="city" type="text" />
      <Field label={t("password")} name="password" type="password" required minLength={8} />

      {state.error === "email_taken" && <p className="text-sm text-danger">{t("errorEmailTaken")}</p>}
      {state.error === "invalid" && <p className="text-sm text-danger">{t("errorInvalid")}</p>}

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

function Field({
  label,
  name,
  type,
  required,
  minLength,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink-soft">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        className="rounded-[var(--radius-s)] border border-border bg-stone-50 px-3 py-2.5 text-ink outline-none focus:border-ember"
      />
    </label>
  );
}
