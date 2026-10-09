"use client";

import { useLocale, useTranslations } from "next-intl";

export function SeasonSelect({ years, selectedYear }: { years: number[]; selectedYear: number }) {
  const t = useTranslations("Events");
  const locale = useLocale();

  return (
    <form action={`/${locale}/events`} method="get" className="relative inline-flex items-center">
      <label className="sr-only" htmlFor="season-year">
        {t("seasonSelectAria")}
      </label>
      <select
        id="season-year"
        name="year"
        defaultValue={String(selectedYear)}
        key={selectedYear}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="appearance-none rounded-full border border-border bg-surface py-[9px] pl-[18px] pr-10 text-[.85rem] font-bold text-ink shadow-[0_1px_4px_rgba(0,0,0,.12)] outline-none transition-colors hover:border-ink-faint focus:border-ember"
      >
        {years.map((year) => (
          <option key={year} value={String(year)}>
            {t("calendarTab", { year })}
          </option>
        ))}
      </select>
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="pointer-events-none absolute right-3.5 text-ink-soft"
        aria-hidden
      >
        <path d="M2 3.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </form>
  );
}
