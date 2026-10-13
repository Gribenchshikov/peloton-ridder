"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function AccountNav({ unreadCount }: { unreadCount: number }) {
  const t = useTranslations("Account");
  const segment = useSelectedLayoutSegment();
  const items = [
    { href: "/account", label: t("profileTitle"), active: segment == null },
    {
      href: "/account/messages",
      label: t("messagesTitle"),
      active: segment === "messages",
      unreadCount,
    },
    { href: "/account/history", label: t("historyTitle"), active: segment === "history" },
  ];

  return (
    <nav className="mt-8 flex flex-wrap gap-x-1 border-b border-border">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            item.active ? "border-ember text-ink" : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          {item.label}
          {item.unreadCount != null && item.unreadCount > 0 && (
            <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-ember px-1.5 py-0.5 align-middle text-[10px] font-bold leading-none text-white">
              {item.unreadCount > 99 ? "99+" : item.unreadCount}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
