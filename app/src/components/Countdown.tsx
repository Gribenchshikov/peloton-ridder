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

export function Countdown({ targetISO }: { targetISO: string }) {
  const t = useTranslations("Countdown");
  const target = new Date(targetISO).getTime();
  // null до монтирования на клиенте — иначе SSR и первый клиентский рендер
  // считают Date.now() в разные моменты и React ловит hydration mismatch.
  const [parts, setParts] = useState<ReturnType<typeof split> | null>(null);

  useEffect(() => {
    setParts(split(target - Date.now()));
    const id = setInterval(() => setParts(split(target - Date.now())), 1000);
    return () => clearInterval(id);
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
        <div key={label} className="flex flex-1 flex-col items-center rounded-[var(--radius-s)] bg-surface-2 px-3 py-2">
          <b className="font-display text-xl tabular-nums text-ink">
            {parts ? String(value).padStart(2, "0") : "--"}
          </b>
          <span className="text-[0.68rem] text-ink-faint">{label}</span>
        </div>
      ))}
    </div>
  );
}
