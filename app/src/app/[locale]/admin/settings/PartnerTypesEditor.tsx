"use client";

import { useState, useTransition } from "react";
import { savePartnerTypesAction } from "@/lib/settingsActions";
import { DEFAULT_PARTNER_TYPES, type PartnerType } from "@/lib/sponsorPackages";

const LANGS = [
  { code: "ru" as const, label: "RU" },
  { code: "kk" as const, label: "KK" },
  { code: "en" as const, label: "EN" },
];

type Lang = "ru" | "kk" | "en";

export function PartnerTypesEditor({ initial }: { initial: PartnerType[] | null }) {
  const [types, setTypes] = useState<PartnerType[]>(initial ?? DEFAULT_PARTNER_TYPES);
  const [activeId, setActiveId] = useState(types[0]?.id ?? "tech");
  const [lang, setLang] = useState<Lang>("ru");
  const [newGive, setNewGive] = useState("");
  const [newGet, setNewGet] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  const pt = types.find((t) => t.id === activeId) ?? types[0];

  function updateType(update: Partial<PartnerType>) {
    setTypes((prev) => prev.map((t) => (t.id === activeId ? { ...t, ...update } : t)));
    setStatus("idle");
  }

  function updateList(
    field: "youGive" | "youGet",
    op:
      | { type: "edit"; idx: number; val: string }
      | { type: "remove"; idx: number }
      | { type: "move"; idx: number; dir: -1 | 1 }
      | { type: "add"; val: string }
  ) {
    const current = [...pt[field][lang]];
    if (op.type === "edit") current[op.idx] = op.val;
    else if (op.type === "remove") current.splice(op.idx, 1);
    else if (op.type === "move") {
      const swap = op.idx + op.dir;
      if (swap < 0 || swap >= current.length) return;
      [current[op.idx], current[swap]] = [current[swap], current[op.idx]];
    } else current.push(op.val);
    updateType({ [field]: { ...pt[field], [lang]: current } });
  }

  function handleSave() {
    setStatus("saving");
    startTransition(async () => {
      const res = await savePartnerTypesAction(types);
      setStatus("error" in res ? "error" : "saved");
    });
  }

  return (
    <section className="rounded-[var(--radius-m)] border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-1 font-display text-lg font-bold text-ink">Форматы партнёрства</h2>
      <p className="mb-5 text-xs text-ink-faint">
        Редактируйте название, описание, а также списки «Вы даёте» и «Вы получаете»
        для каждого формата на трёх языках.
      </p>

      {/* Type selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setActiveId(t.id); setStatus("idle"); }}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              t.id === activeId
                ? "bg-ember text-white"
                : "bg-surface-2 text-ink-soft hover:text-ink"
            }`}
          >
            {t.name.ru}
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

      <div className="flex flex-col gap-5">
        {/* Name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-ink-faint">Название</label>
          <input
            value={pt.name[lang]}
            onChange={(e) => updateType({ name: { ...pt.name, [lang]: e.target.value } })}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm font-bold text-ink focus:border-ember focus:outline-none"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-ink-faint">Описание</label>
          <textarea
            value={pt.description[lang]}
            rows={2}
            onChange={(e) => updateType({ description: { ...pt.description, [lang]: e.target.value } })}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
          />
        </div>

        {/* Two-column lists */}
        <div className="grid gap-4 sm:grid-cols-2">
          <BenefitList
            label="Вы даёте"
            items={pt.youGive[lang]}
            newVal={newGive}
            setNewVal={setNewGive}
            onEdit={(idx, val) => updateList("youGive", { type: "edit", idx, val })}
            onRemove={(idx) => updateList("youGive", { type: "remove", idx })}
            onMove={(idx, dir) => updateList("youGive", { type: "move", idx, dir })}
            onAdd={() => { if (newGive.trim()) { updateList("youGive", { type: "add", val: newGive.trim() }); setNewGive(""); } }}
          />
          <BenefitList
            label="Вы получаете"
            items={pt.youGet[lang]}
            newVal={newGet}
            setNewVal={setNewGet}
            onEdit={(idx, val) => updateList("youGet", { type: "edit", idx, val })}
            onRemove={(idx) => updateList("youGet", { type: "remove", idx })}
            onMove={(idx, dir) => updateList("youGet", { type: "move", idx, dir })}
            onAdd={() => { if (newGet.trim()) { updateList("youGet", { type: "add", val: newGet.trim() }); setNewGet(""); } }}
          />
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
          {status === "saving" ? "Сохраняем…" : "Сохранить форматы"}
        </button>
        {status === "saved" && <span className="text-sm text-spruce">Сохранено ✓</span>}
        {status === "error"  && <span className="text-sm text-danger">Ошибка при сохранении</span>}
      </div>
    </section>
  );
}

function BenefitList({
  label, items, newVal, setNewVal, onEdit, onRemove, onMove, onAdd,
}: {
  label: string;
  items: string[];
  newVal: string;
  setNewVal: (v: string) => void;
  onEdit: (idx: number, val: string) => void;
  onRemove: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-ink-faint">
        {label}{" "}
        <span className="font-normal opacity-60">({items.length})</span>
      </p>

      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-[var(--radius-s)] border border-border">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5 bg-surface px-2 py-1.5">
            <div className="flex shrink-0 flex-col">
              <button type="button" onClick={() => onMove(idx, -1)} disabled={idx === 0}
                className="text-ink-faint disabled:opacity-20 hover:text-ink">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button type="button" onClick={() => onMove(idx, 1)} disabled={idx === items.length - 1}
                className="text-ink-faint disabled:opacity-20 hover:text-ink">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <input value={item} onChange={(e) => onEdit(idx, e.target.value)}
              className="flex-1 bg-transparent text-xs text-ink focus:outline-none" />
            <button type="button" onClick={() => onRemove(idx)}
              className="shrink-0 text-ink-faint hover:text-danger">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        <input type="text" value={newVal} onChange={(e) => setNewVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
          placeholder="Добавить…"
          className="flex-1 rounded-[var(--radius-s)] border border-border bg-surface px-2 py-1 text-xs text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none"
        />
        <button type="button" onClick={onAdd}
          className="shrink-0 rounded-[var(--radius-s)] border border-border px-2 py-1 text-xs font-semibold text-ink-soft hover:border-ink-soft hover:text-ink">
          +
        </button>
      </div>
    </div>
  );
}
