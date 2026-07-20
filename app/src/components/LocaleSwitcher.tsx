"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition, useState, useRef, useEffect } from "react";

const LOCALES = [
  { code: "ru", label: "Русский" },
  { code: "kk", label: "Қазақша" },
  { code: "en", label: "English" },
] as const;

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function switchLocale(next: string) {
    setOpen(false);
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-[var(--radius-s)] px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} className="shrink-0">
          <circle cx="7" cy="7" r="6" />
          <path d="M7 1c-1.5 2-2.5 3.8-2.5 6s1 4 2.5 6" />
          <path d="M7 1c1.5 2 2.5 3.8 2.5 6s-1 4-2.5 6" />
          <path d="M1 7h12" />
        </svg>
        {locale}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.5} className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M2 3.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[130px] overflow-hidden rounded-[var(--radius-s)] border border-border bg-surface shadow-[var(--shadow)]">
          {LOCALES.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              onClick={() => switchLocale(code)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2 ${
                locale === code ? "font-bold text-ink" : "text-ink-soft"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wide opacity-50">{code}</span>
              {label}
              {locale === code && (
                <svg className="ml-auto" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
