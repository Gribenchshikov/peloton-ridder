"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";

const LOCALES = ["ru", "kk", "en"] as const;

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(next: string) {
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div className={`flex items-center gap-0.5 ${className ?? ""}`}>
      {LOCALES.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchLocale(loc)}
          disabled={isPending || locale === loc}
          className={`rounded px-2 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
            locale === loc
              ? "bg-surface-2 text-ink"
              : "text-ink-faint hover:text-ink disabled:cursor-default"
          }`}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
