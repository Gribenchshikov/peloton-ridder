import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function AdminFormHeader({ title, backHref, backLabel }: { title: string; backHref?: string; backLabel?: string }) {
  const t = useTranslations("Admin");

  return (
    <div>
      <Link href={backHref ?? "/admin"} className="text-sm font-semibold text-ink-faint transition-colors hover:text-ink">
        ← {backLabel ?? t("backToAdminCta")}
      </Link>
      <div className="mt-4">
        <span className="text-xs font-bold uppercase tracking-wide text-ember">{t("eyebrow")}</span>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">{title}</h1>
      </div>
    </div>
  );
}
