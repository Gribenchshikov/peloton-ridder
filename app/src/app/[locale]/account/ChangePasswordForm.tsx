"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/FormField";
import { changePasswordAction, type ChangePasswordState } from "./changePasswordAction";

const initialState: ChangePasswordState = {};

const ERROR_KEYS: Record<string, string> = {
  wrong_current: "pwdWrongCurrent",
  mismatch: "pwdMismatch",
  password_weak: "pwdWeak",
  invalid: "pwdInvalid",
};

export function ChangePasswordForm() {
  const t = useTranslations("Account");
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  return (
    <section>
      <h2 className="font-display text-lg font-bold text-ink">{t("changePwdTitle")}</h2>
      <form action={formAction} className="mt-3 flex flex-col gap-4 rounded-[var(--radius-m)] border border-border bg-surface p-5">
        <FormField label={t("pwdCurrent")} name="currentPassword" type="password" required />
        <FormField label={t("pwdNew")} name="newPassword" type="password" required minLength={8} />
        <FormField label={t("pwdConfirm")} name="confirmPassword" type="password" required minLength={8} />

        {state.success && <p className="text-sm text-spruce">{t("pwdSaved")}</p>}
        {state.error && ERROR_KEYS[state.error] && (
          <p className="text-sm text-danger">{t(ERROR_KEYS[state.error])}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
        >
          {pending ? t("pwdSubmitting") : t("pwdSaveCta")}
        </button>
      </form>
    </section>
  );
}
