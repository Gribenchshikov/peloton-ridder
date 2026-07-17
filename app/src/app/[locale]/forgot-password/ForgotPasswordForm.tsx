"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/FormField";
import { AuthSuccessCard } from "@/components/AuthSuccessCard";
import { forgotPasswordAction, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);

  if (state.success) {
    return <AuthSuccessCard title={t("checkEmailTitle")} text={t("forgotSentText")} />;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label={t("email")} name="email" type="email" required />

      {state.error === "invalid" && <p className="text-sm text-danger">{t("errorInvalid")}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
      >
        {pending ? t("submitting") : t("forgotSubmitCta")}
      </button>
    </form>
  );
}
