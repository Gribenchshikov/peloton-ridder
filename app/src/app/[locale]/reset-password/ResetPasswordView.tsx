import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ResetPasswordForm } from "./ResetPasswordForm";

export function ResetPasswordView({ token, valid }: { token?: string; valid: boolean }) {
  const t = useTranslations("Auth");

  if (!valid || !token) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md text-center">
          <h1 className="font-display text-2xl font-bold text-ink">{t("resetInvalidTitle")}</h1>
          <p className="mt-2 text-sm text-ink-soft">{t("resetInvalidText")}</p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-block rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
          >
            {t("resetRetryCta")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <span className="text-xs font-bold uppercase tracking-wide text-ember">{t("resetEyebrow")}</span>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">{t("resetTitle")}</h1>
        <div className="mt-6">
          <ResetPasswordForm token={token} />
        </div>
      </div>
    </main>
  );
}
