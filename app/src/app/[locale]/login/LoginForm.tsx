"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FormField } from "@/components/FormField";
import { loginAction, googleSignInAction, type LoginState } from "./actions";

const initialState: LoginState = {};

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

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="flex flex-col gap-5">
      {/* Google */}
      <form action={googleSignInAction}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-[var(--radius-s)] border border-border bg-surface px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          <GoogleIcon />
          Войти через Google
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-ink-faint">или</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Email + password */}
      <form action={formAction} className="flex flex-col gap-4">
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
        <FormField label={t("email")} name="email" type="email" required />
        <FormField label={t("password")} name="password" type="password" required />
        <Link href="/forgot-password" className="-mt-2 self-end text-sm font-semibold text-ember hover:underline">
          {t("forgotPasswordCta")}
        </Link>

        {state.error && <p className="text-sm text-danger">{t("errorInvalidCredentials")}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
        >
          {pending ? t("submitting") : t("loginCta")}
        </button>
      </form>
    </div>
  );
}
