"use client";

import { useState, useTransition } from "react";
import { savePartnershipContentAction, type PartnershipContent, type StatItem } from "@/lib/settingsActions";

const DEFAULT: PartnershipContent = {
  heroTitle: "Поддержите горный спорт",
  heroEmphasis: "в Казахстане",
  heroSubtitle:
    "Peloton Ridder объединяет сотни бегунов в горах Восточного Казахстана. Наши старты — это живое сообщество, медиаприсутствие и прямой контакт с активной и платёжеспособной аудиторией.",
  stats: [
    { value: "400+", label: "участников в сезоне" },
    { value: "3", label: "старта в год" },
    { value: "7", label: "лет в Риддере" },
    { value: "18–65", label: "лет — средний возраст аудитории" },
  ],
  sponsorsIntro:
    "Выберите уровень присутствия вашего бренда на наших событиях. Для каждого пакета мы разрабатываем индивидуальное предложение — свяжитесь с нами, чтобы обсудить детали.",
  partnersIntro:
    "Партнёрство — это не спонсорство. Здесь мы ищем взаимовыгодный обмен ценностями: продуктом, экспертизой или аудиторией.",
};

export function PartnershipEditor({ initial }: { initial: PartnershipContent | null }) {
  const data = initial ?? DEFAULT;
  const [heroTitle, setHeroTitle] = useState(data.heroTitle);
  const [heroEmphasis, setHeroEmphasis] = useState(data.heroEmphasis);
  const [heroSubtitle, setHeroSubtitle] = useState(data.heroSubtitle);
  const [stats, setStats] = useState<StatItem[]>(data.stats);
  const [sponsorsIntro, setSponsorsIntro] = useState(data.sponsorsIntro);
  const [partnersIntro, setPartnersIntro] = useState(data.partnersIntro);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  function updateStat(i: number, field: "value" | "label", val: string) {
    setStats((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)));
    setStatus("idle");
  }

  function handleSave() {
    setStatus("saving");
    startTransition(async () => {
      const result = await savePartnershipContentAction({
        heroTitle, heroEmphasis, heroSubtitle, stats, sponsorsIntro, partnersIntro,
      });
      setStatus("error" in result ? "error" : "saved");
    });
  }

  return (
    <section className="rounded-[var(--radius-m)] border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-5 font-display text-lg font-bold text-ink">Страница партнёрства</h2>

      {/* Hero */}
      <div className="mb-6 flex flex-col gap-4">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">Заголовок hero</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs text-ink-faint">Основной текст</label>
            <input
              value={heroTitle}
              onChange={(e) => { setHeroTitle(e.target.value); setStatus("idle"); }}
              className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs text-ink-faint">Акцентный текст (оранжевый)</label>
            <input
              value={heroEmphasis}
              onChange={(e) => { setHeroEmphasis(e.target.value); setStatus("idle"); }}
              className="rounded-[var(--radius-s)] border border-ember/40 bg-ember/5 px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink-faint">Подзаголовок (описание)</label>
          <textarea
            value={heroSubtitle}
            rows={3}
            onChange={(e) => { setHeroSubtitle(e.target.value); setStatus("idle"); }}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-faint">Цифры охвата</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-[var(--radius-s)] border border-border p-3">
              <input
                value={s.value}
                onChange={(e) => updateStat(i, "value", e.target.value)}
                placeholder="Значение (напр. «400+»)"
                className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm font-bold text-ink focus:border-ember focus:outline-none"
              />
              <input
                value={s.label}
                onChange={(e) => updateStat(i, "label", e.target.value)}
                placeholder="Подпись"
                className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink-soft focus:border-ember focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Section intros */}
      <div className="mb-6 flex flex-col gap-4">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">Вводные тексты разделов</p>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink-faint">Раздел «Спонсорство» — описание</label>
          <textarea
            value={sponsorsIntro}
            rows={2}
            onChange={(e) => { setSponsorsIntro(e.target.value); setStatus("idle"); }}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink-faint">Раздел «Партнёрство» — описание</label>
          <textarea
            value={partnersIntro}
            rows={2}
            onChange={(e) => { setPartnersIntro(e.target.value); setStatus("idle"); }}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-[var(--radius-s)] bg-ember px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 hover:bg-ember-strong"
        >
          {status === "saving" ? "Сохраняем…" : "Сохранить"}
        </button>
        {status === "saved" && <span className="text-sm text-spruce">Сохранено ✓</span>}
        {status === "error" && <span className="text-sm text-danger">Ошибка при сохранении</span>}
      </div>
    </section>
  );
}
