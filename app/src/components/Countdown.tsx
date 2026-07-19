"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

function split(msLeft: number) {
  const clamped = Math.max(0, msLeft);
  const days = Math.floor(clamped / 86_400_000);
  const hours = Math.floor((clamped / 3_600_000) % 24);
  const min = Math.floor((clamped / 60_000) % 60);
  const sec = Math.floor((clamped / 1_000) % 60);
  return { days, hours, min, sec };
}

export function Countdown({ targetISO, dark }: { targetISO: string; dark?: boolean }) {
  const t = useTranslations("Countdown");
  const target = new Date(targetISO).getTime();
  // null до монтирования на клиенте — иначе SSR и первый клиентский рендер
  // считают Date.now() в разные моменты и React ловит hydration mismatch.
  const [parts, setParts] = useState<ReturnType<typeof split> | null>(null);

  useEffect(() => {
    // Запускаем первый расчёт уже после монтирования, чтобы не смешивать время
    // серверного и клиентского рендера и не вызывать setState синхронно в effect.
    const update = () => setParts(split(target - Date.now()));
    const initialId = window.setTimeout(update, 0);
    const intervalId = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(initialId);
      window.clearInterval(intervalId);
    };
  }, [target]);

  const cells: [number, string][] = [
    [parts?.days ?? 0, t("days")],
    [parts?.hours ?? 0, t("hours")],
    [parts?.min ?? 0, t("min")],
    [parts?.sec ?? 0, t("sec")],
  ];

  return (
    <div className="flex gap-3" suppressHydrationWarning>
      {cells.map(([value, label]) => (
        <div
          key={label}
          className={`flex flex-1 flex-col items-center rounded-[10px] px-3 py-[10px] text-center ${
            dark
              ? "border border-[rgba(251,248,241,.18)] bg-[rgba(251,248,241,.08)]"
              : "bg-surface-2"
          }`}
        >
          <b className={`block font-display text-xl tabular-nums ${dark ? "text-[#FBF8F1]" : "text-ink"}`}>
            {parts ? String(value).padStart(2, "0") : "--"}
          </b>
          <span className={`text-[0.62rem] uppercase tracking-wider ${dark ? "text-[rgba(251,248,241,.55)]" : "text-ink-faint"}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
