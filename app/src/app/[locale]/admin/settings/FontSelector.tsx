"use client";

import { useState, useTransition } from "react";
import { saveFontAction } from "./actions";

const FONTS = [
  {
    key: "unbounded" as const,
    label: "Unbounded",
    desc: "Текущий — широкий геометрический",
    css: "'Unbounded', 'Arial Black', sans-serif",
  },
  {
    key: "oswald" as const,
    label: "Oswald",
    desc: "Конденсированный — популярен в спорте",
    css: "'Oswald', 'Arial Narrow', sans-serif",
  },
  {
    key: "bebas-neue" as const,
    label: "Bebas Neue",
    desc: "Дерзкий — только латиница",
    css: "'Bebas Neue', Impact, sans-serif",
  },
  {
    key: "impact" as const,
    label: "Impact",
    desc: "Системный — максимальная жирность",
    css: "Impact, 'Arial Narrow', sans-serif",
  },
  {
    key: "georgia" as const,
    label: "Georgia",
    desc: "Классический засечный",
    css: "Georgia, 'Times New Roman', serif",
  },
];

type FontKey = (typeof FONTS)[number]["key"];

export function FontSelector({ initial }: { initial: FontKey }) {
  const [active, setActive] = useState<FontKey>(initial);
  const [isPending, startTransition] = useTransition();

  function select(key: FontKey) {
    setActive(key);
    startTransition(async () => {
      await saveFontAction(key);
    });
  }

  return (
    <section className="rounded-[var(--radius-m)] border border-border bg-surface p-6 shadow-sm flex flex-col gap-4">
      <div>
        <h2 className="font-display text-lg font-bold text-ink">Шрифт заголовков</h2>
        <p className="mt-1 text-xs text-ink-soft">Применяется ко всем заголовкам сайта мгновенно.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FONTS.map((f) => {
          const isActive = active === f.key;
          return (
            <button
              key={f.key}
              type="button"
              disabled={isPending}
              onClick={() => select(f.key)}
              className={`flex flex-col gap-2 rounded-[var(--radius-s)] border-2 p-4 text-left transition-colors ${
                isActive
                  ? "border-ember bg-ember-tint"
                  : "border-border bg-surface-2 hover:border-ember/50"
              }`}
            >
              <span
                className="text-2xl font-bold text-ink leading-none"
                style={{ fontFamily: f.css }}
              >
                Ridder
              </span>
              <span className="text-sm font-semibold text-ink">{f.label}</span>
              <span className="text-xs text-ink-faint">{f.desc}</span>
              {isActive && (
                <span className="mt-1 w-fit rounded-full bg-ember px-2 py-0.5 text-[10px] font-bold text-white">
                  Активен
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
