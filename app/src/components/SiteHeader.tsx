import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { MobileMenu } from "./MobileMenu";
import { LocaleSwitcher } from "./LocaleSwitcher";

export async function SiteHeader({ locale }: { locale: string }) {
  const [session, t] = await Promise.all([auth(), getTranslations("Nav")]);
  const isAdmin = session?.user?.isAdmin ?? false;
  const isLoggedIn = Boolean(session?.user);
  const firstName = session?.user?.firstName;

  const navLinks = [
    { href: "/", label: t("home") },
    { href: "/events", label: t("races") },
    { href: "/series", label: t("series") },
    { href: "/partnership", label: t("partnership") },
    { href: "/about", label: t("about") },
  ];

  return (
    <header className="relative sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Peloton Ridder">
          <img src="/logo.png" alt="Peloton Ridder" className="h-14 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-[var(--radius-s)] px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Desktop right side */}
        <div className="hidden items-center gap-2 md:flex">
          <LocaleSwitcher />

          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-[var(--radius-s)] bg-ember px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-ember-strong"
            >
              {t("adminPanel")}
            </Link>
          )}

          {isLoggedIn ? (
            <Link
              href="/account"
              className="rounded-[var(--radius-s)] border border-border px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
            >
              {firstName ?? t("profile")}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-[var(--radius-s)] border border-border px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
              >
                {t("signIn")}
              </Link>
              <Link
                href="/register"
                className="rounded-[var(--radius-s)] bg-ember px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-ember-strong"
              >
                {t("register")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu */}
        <MobileMenu
          locale={locale}
          navLinks={navLinks}
          isLoggedIn={isLoggedIn}
          isAdmin={isAdmin}
          profileLabel={firstName ?? t("profile")}
          signInLabel={t("signIn")}
          registerLabel={t("register")}
          adminLabel={t("adminPanel")}
        />
      </div>
    </header>
  );
}
