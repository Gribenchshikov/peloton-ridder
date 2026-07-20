"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/FormField";
import { changeEmailAction, type ChangeEmailState } from "./changeEmailAction";

const initialState: ChangeEmailState = {};

const ERROR_KEYS: Record<string, string> = {
  wrong_password: "changeEmailWrongPassword",
  email_taken:   "changeEmailTaken",
  same_email:    "changeEmailSame",
  invalid:       "changeEmailInvalid",
};

export function ChangeEmailForm({ currentEmail, locale }: { currentEmail: string; locale: string }) {
  const t = useTranslations("Account");
  const boundAction = changeEmailAction.bind(null, locale);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <section>
      <h2 className="font-display text-lg font-bold text-ink">{t("changeEmailTitle")}</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {t("changeEmailCurrent")}{" "}
        <span className="font-semibold text-ink">{currentEmail}</span>
      </p>
      {state.success ? (
        <div className="mt-3 rounded-[var(--radius-m)] border border-spruce/30 bg-spruce/5 p-4 text-sm text-spruce">
          {t("changeEmailSent")}
        </div>
      ) : (
        <form action={formAction} className="mt-3 flex flex-col gap-4 rounded-[var(--radius-m)] border border-border bg-surface p-5">
          <FormField label={t("changeEmailNew")} name="newEmail" type="email" required />
          <FormField label={t("pwdCurrent")} name="currentPassword" type="password" required />

          {state.error && ERROR_KEYS[state.error] && (
            <p className="text-sm text-danger">{t(ERROR_KEYS[state.error])}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
          >
            {pending ? t("changeEmailSubmitting") : t("changeEmailCta")}
          </button>
        </form>
      )}
    </section>
  );
}
