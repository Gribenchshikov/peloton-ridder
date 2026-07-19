import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-display text-sm font-bold text-ink">Peloton Ridder</div>
          <div className="mt-0.5 text-xs text-ink-faint">{t("tagline")}</div>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/events" className="text-sm text-ink-soft transition-colors hover:text-ink">
            {t("races")}
          </Link>
          <Link href="/about" className="text-sm text-ink-soft transition-colors hover:text-ink">
            {t("about")}
          </Link>
          <Link href="/legal/privacy" className="text-sm text-ink-soft transition-colors hover:text-ink">
            {t("privacy")}
          </Link>
          <Link href="/legal/offer" className="text-sm text-ink-soft transition-colors hover:text-ink">
            {t("offer")}
          </Link>
        </nav>

        <div className="text-xs text-ink-faint">© {year} Peloton Ridder</div>
      </div>
    </footer>
  );
}
