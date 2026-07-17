import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  const t = useTranslations("Auth");
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <span className="text-xs font-bold uppercase tracking-wide text-ember">{t("registerEyebrow")}</span>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">{t("registerTitle")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t("registerSubtitle")}</p>
        <div className="mt-6">
          <RegisterForm />
        </div>
        <p className="mt-6 text-center text-sm text-ink-faint">
          {t("hasAccount")}{" "}
          <Link href="/login" className="font-semibold text-ember hover:underline">
            {t("loginCta")}
          </Link>
        </p>
      </div>
    </main>
  );
}
