import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { countPendingRefundRequests } from "@/lib/queries";
import { settleAcceptedRefundsOnce } from "@/lib/refundPayout";
import { countUnreadUserMessages } from "@/lib/userMessages";
import { MobileMenu } from "./MobileMenu";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { UnreadCountBadge } from "./UnreadCountBadge";

export async function SiteHeader({ locale }: { locale: string }) {
  const [session, t] = await Promise.all([auth(), getTranslations("Nav")]);
  const isAdmin = session?.user?.isAdmin ?? false;
  const isLoggedIn = Boolean(session?.user);
  const firstName = session?.user?.firstName;
  const unreadMessageCountPromise = session?.user?.id
    ? countUnreadUserMessages(session.user.id)
    : Promise.resolve(0);
  const pendingRefundCount = isAdmin
    ? await settleAcceptedRefundsOnce().then(() => countPendingRefundRequests())
    : 0;
  const unreadMessageCount = await unreadMessageCountPromise;
  const accountHref = unreadMessageCount > 0 ? "/account/messages" : "/account";
  const unreadLabel = t("unreadMessages", { count: unreadMessageCount });

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

          {isAdmin && pendingRefundCount > 0 && (
            <Link
              href="/admin/refunds"
              className="rounded-[var(--radius-s)] bg-warn-tint px-3 py-1.5 text-xs font-bold text-warn transition-colors hover:bg-warn/20"
            >
              {t("pendingRefunds", { count: pendingRefundCount })}
            </Link>
          )}

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
              href={accountHref}
              className="relative rounded-[var(--radius-s)] border border-border px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
            >
              {firstName ?? t("profile")}
              <UnreadCountBadge count={unreadMessageCount} label={unreadLabel} />
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
          accountHref={accountHref}
          signInLabel={t("signIn")}
          registerLabel={t("register")}
          adminLabel={t("adminPanel")}
          pendingRefundCount={pendingRefundCount}
          pendingRefundsLabel={pendingRefundCount > 0 ? t("pendingRefunds", { count: pendingRefundCount }) : undefined}
          unreadMessageCount={unreadMessageCount}
          unreadMessagesLabel={unreadMessageCount > 0 ? unreadLabel : undefined}
        />
      </div>
    </header>
  );
}
