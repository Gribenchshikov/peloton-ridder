import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand + Contacts */}
          <div>
            <div className="font-display text-sm font-bold text-ink">Peloton Ridder</div>
            <div className="mt-0.5 text-xs text-ink-faint">{t("tagline")}</div>
            <div className="mt-4 flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {t("orgCommittee")}
              </span>
              <a
                href={`tel:${t("phone1").replace(/\s/g, "")}`}
                className="text-sm text-ink-soft transition-colors hover:text-ink"
              >
                {t("phone1")}
              </a>
              <a
                href={`tel:${t("phone2").replace(/\s/g, "")}`}
                className="text-sm text-ink-soft transition-colors hover:text-ink"
              >
                {t("phone2")}
              </a>
              <a
                href={`mailto:${t("email")}`}
                className="text-sm text-ink-soft transition-colors hover:text-ink"
              >
                {t("email")}
              </a>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-2">
            <Link href="/events" className="text-sm text-ink-soft transition-colors hover:text-ink">
              {t("races")}
            </Link>
            <Link href="/about" className="text-sm text-ink-soft transition-colors hover:text-ink">
              {t("about")}
            </Link>
          </nav>

          {/* Legal documents */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {t("legalTitle")}
            </span>
            <Link href="/legal/offer" className="text-sm text-ink-soft transition-colors hover:text-ink">
              {t("offer")}
            </Link>
            <Link href="/legal/refund" className="text-sm text-ink-soft transition-colors hover:text-ink">
              {t("refund")}
            </Link>
            <Link href="/legal/payment" className="text-sm text-ink-soft transition-colors hover:text-ink">
              {t("payment")}
            </Link>
            <Link href="/legal/privacy" className="text-sm text-ink-soft transition-colors hover:text-ink">
              {t("privacy")}
            </Link>
            <Link href="/legal/consent" className="text-sm text-ink-soft transition-colors hover:text-ink">
              {t("consent")}
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-xs text-ink-faint">
          © {year} Peloton Ridder
        </div>
      </div>
    </footer>
  );
}
