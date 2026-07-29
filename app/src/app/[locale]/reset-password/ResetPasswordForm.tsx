"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FormField } from "@/components/FormField";
import { AuthSuccessCard } from "@/components/AuthSuccessCard";
import { resetPasswordAction, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  if (state.success) {
    return (
      <AuthSuccessCard title={t("resetSuccessTitle")} text={t("resetSuccessText")}>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
        >
          {t("loginCta")}
        </Link>
      </AuthSuccessCard>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <FormField label={t("newPassword")} name="password" type="password" required minLength={8} />

      {state.error === "invalid" && <p className="text-sm text-danger">{t("errorInvalid")}</p>}
      {state.error === "password_weak" && <p className="text-sm text-danger">{t("errorPasswordWeak")}</p>}
      {state.error === "expired" && <p className="text-sm text-danger">{t("resetInvalidText")}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
      >
        {pending ? t("submitting") : t("resetSubmitCta")}
      </button>
    </form>
  );
}
