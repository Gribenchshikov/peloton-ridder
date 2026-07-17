import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth");
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <span className="text-xs font-bold uppercase tracking-wide text-ember">{t("forgotEyebrow")}</span>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">{t("forgotTitle")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t("forgotSubtitle")}</p>
        <div className="mt-6">
          <ForgotPasswordForm />
        </div>
        <p className="mt-6 text-center text-sm text-ink-faint">
          <Link href="/login" className="font-semibold text-ember hover:underline">
            {t("backToLoginCta")}
          </Link>
        </p>
      </div>
    </main>
  );
}
