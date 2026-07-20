"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";

type NavLink = { href: string; label: string };

export function MobileMenu({
  navLinks,
  isLoggedIn,
  isAdmin,
  profileLabel,
  signInLabel,
  registerLabel,
  adminLabel,
}: {
  locale: string;
  navLinks: NavLink[];
  isLoggedIn: boolean;
  isAdmin: boolean;
  profileLabel: string;
  signInLabel: string;
  registerLabel: string;
  adminLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Меню"
        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-s)] text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
      >
        {open ? (
          <svg width="18" height="18" fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M3 3l12 12M15 3L3 15" />
          </svg>
        ) : (
          <svg width="18" height="18" fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M2 4.5h14M2 9h14M2 13.5h14" />
          </svg>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-14 z-50 border-b border-border bg-surface px-6 py-4 shadow-[var(--shadow)]"
          onClick={() => setOpen(false)}
        >
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-[var(--radius-s)] px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface-2 hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-3 border-t border-border pt-3">
            <LocaleSwitcher />
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-[var(--radius-s)] bg-ember px-3 py-2.5 text-center text-sm font-bold text-white"
              >
                {adminLabel}
              </Link>
            )}
            {isLoggedIn ? (
              <Link
                href="/account"
                className="rounded-[var(--radius-s)] border border-border px-3 py-2.5 text-center text-sm font-semibold text-ink"
              >
                {profileLabel}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-[var(--radius-s)] border border-border px-3 py-2.5 text-center text-sm font-semibold text-ink"
                >
                  {signInLabel}
                </Link>
                <Link
                  href="/register"
                  className="rounded-[var(--radius-s)] bg-ember px-3 py-2.5 text-center text-sm font-bold text-white"
                >
                  {registerLabel}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
