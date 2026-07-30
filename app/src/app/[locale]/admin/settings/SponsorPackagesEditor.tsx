"use client";

import { useState, useTransition } from "react";
import { saveSponsorPackagesAction } from "@/lib/settingsActions";
import { DEFAULT_SPONSOR_PACKAGES, type SponsorPackage } from "@/lib/sponsorPackages";

const LANGS = [
  { code: "ru" as const, label: "RU" },
  { code: "kk" as const, label: "KK" },
  { code: "en" as const, label: "EN" },
];

type Lang = "ru" | "kk" | "en";

export function SponsorPackagesEditor({
  initial,
}: {
  initial: SponsorPackage[] | null;
}) {
  const [packages, setPackages] = useState<SponsorPackage[]>(
    initial ?? DEFAULT_SPONSOR_PACKAGES
  );
  const [activeId, setActiveId] = useState(packages[0]?.id ?? "title");
  const [lang, setLang] = useState<Lang>("ru");
  const [newBenefit, setNewBenefit] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  const pkg = packages.find((p) => p.id === activeId) ?? packages[0];

  function updatePkg(update: Partial<SponsorPackage>) {
    setPackages((prev) =>
      prev.map((p) => (p.id === activeId ? { ...p, ...update } : p))
    );
    setStatus("idle");
  }

  function updateTier(val: string) {
    updatePkg({ tier: { ...pkg.tier, [lang]: val } });
  }

  function updateLabel(val: string) {
    updatePkg({ label: { ...pkg.label, [lang]: val } });
  }

  function updateBenefit(idx: number, val: string) {
    const list = [...pkg.benefits[lang]];
    list[idx] = val;
    updatePkg({ benefits: { ...pkg.benefits, [lang]: list } });
  }

  function removeBenefit(idx: number) {
    const list = pkg.benefits[lang].filter((_, i) => i !== idx);
    updatePkg({ benefits: { ...pkg.benefits, [lang]: list } });
  }

  function moveBenefit(idx: number, dir: -1 | 1) {
    const list = [...pkg.benefits[lang]];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    [list[idx], list[swapIdx]] = [list[swapIdx], list[idx]];
    updatePkg({ benefits: { ...pkg.benefits, [lang]: list } });
  }

  function addBenefit() {
    const val = newBenefit.trim();
    if (!val) return;
    const list = [...pkg.benefits[lang], val];
    updatePkg({ benefits: { ...pkg.benefits, [lang]: list } });
    setNewBenefit("");
  }

  function handleSave() {
    setStatus("saving");
    startTransition(async () => {
      const res = await saveSponsorPackagesAction(packages);
      setStatus("error" in res ? "error" : "saved");
    });
  }

  return (
    <section className="rounded-[var(--radius-m)] border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-1 font-display text-lg font-bold text-ink">
        Спонсорские пакеты
      </h2>
      <p className="mb-5 text-xs text-ink-faint">
        Редактируйте название, подзаголовок и список преимуществ для каждого пакета
        на трёх языках. Изменения сразу отражаются на странице партнёрства.
      </p>

      {/* Package selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {packages.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => { setActiveId(p.id); setStatus("idle"); }}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              p.id === activeId
                ? "bg-ember text-white"
                : "bg-surface-2 text-ink-soft hover:text-ink"
            }`}
          >
            {p.tier.ru}
            {p.featured && (
              <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wide opacity-70">
                ★ топ
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lang tabs */}
      <div className="mb-5 flex gap-1 border-b border-border">
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => { setLang(l.code); setStatus("idle"); }}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              lang === l.code
                ? "border-ember text-ink"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4">
        {/* Tier name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-ink-faint">Название пакета</label>
          <input
            value={pkg.tier[lang]}
            onChange={(e) => updateTier(e.target.value)}
            placeholder="Например: Титульный"
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm font-bold text-ink focus:border-ember focus:outline-none"
          />
        </div>

        {/* Label */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-ink-faint">Подзаголовок</label>
          <input
            value={pkg.label[lang]}
            onChange={(e) => updateLabel(e.target.value)}
            placeholder="Например: Максимальная видимость"
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
          />
        </div>

        {/* Benefits */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-ink-faint">
            Преимущества{" "}
            <span className="font-normal text-ink-faint/60">
              ({pkg.benefits[lang].length} пунктов)
            </span>
          </label>

          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-[var(--radius-s)] border border-border">
            {pkg.benefits[lang].map((b, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-surface px-3 py-2">
                {/* Reorder */}
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => moveBenefit(idx, -1)}
                    disabled={idx === 0}
                    className="text-ink-faint disabled:opacity-20 hover:text-ink"
                    title="Вверх"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBenefit(idx, 1)}
                    disabled={idx === pkg.benefits[lang].length - 1}
                    className="text-ink-faint disabled:opacity-20 hover:text-ink"
                    title="Вниз"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                {/* Text */}
                <input
                  value={b}
                  onChange={(e) => updateBenefit(idx, e.target.value)}
                  className="flex-1 bg-transparent text-sm text-ink focus:outline-none"
                />

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => removeBenefit(idx)}
                  className="shrink-0 text-ink-faint transition-colors hover:text-danger"
                  title="Удалить"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add new benefit */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newBenefit}
              onChange={(e) => setNewBenefit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addBenefit(); }
              }}
              placeholder="Добавить пункт…"
              className="flex-1 rounded-[var(--radius-s)] border border-border bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none"
            />
            <button
              type="button"
              onClick={addBenefit}
              className="shrink-0 rounded-[var(--radius-s)] border border-border px-3 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:border-ink-soft hover:text-ink"
            >
              + Добавить
            </button>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-[var(--radius-s)] bg-ember px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
        >
          {status === "saving" ? "Сохраняем…" : "Сохранить пакеты"}
        </button>
        {status === "saved" && <span className="text-sm text-spruce">Сохранено ✓</span>}
        {status === "error"  && <span className="text-sm text-danger">Ошибка при сохранении</span>}
      </div>
    </section>
  );
}
