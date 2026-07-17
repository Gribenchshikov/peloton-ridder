import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LoginForm } from "./LoginForm";

export function LoginView({ callbackUrl }: { callbackUrl?: string }) {
  const t = useTranslations("Auth");
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <span className="text-xs font-bold uppercase tracking-wide text-ember">{t("loginEyebrow")}</span>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">{t("loginTitle")}</h1>
        <div className="mt-6">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
        <p className="mt-6 text-center text-sm text-ink-faint">
          {t("noAccount")}{" "}
          <Link href="/register" className="font-semibold text-ember hover:underline">
            {t("registerCta")}
          </Link>
        </p>
      </div>
    </main>
  );
}
