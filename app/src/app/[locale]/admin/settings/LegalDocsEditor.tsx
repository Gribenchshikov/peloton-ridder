"use client";

import { useState, useTransition } from "react";
import { saveLegalDocAction } from "./actions";

const DOCS = [
  { key: "refund",  label: "Политика возвратов" },
  { key: "offer",   label: "Публичная оферта" },
  { key: "privacy", label: "Политика конфиденциальности" },
  { key: "consent", label: "Согласие на обработку данных" },
  { key: "payment", label: "Описание процедуры оплаты" },
] as const;

const LANGS = [
  { code: "ru", label: "RU" },
  { code: "kk", label: "KK" },
  { code: "en", label: "EN" },
] as const;

type DocKey = (typeof DOCS)[number]["key"];
type LangCode = (typeof LANGS)[number]["code"];

export function LegalDocsEditor({
  initial,
}: {
  initial: Record<string, string>;
}) {
  const [doc, setDoc] = useState<DocKey>("refund");
  const [lang, setLang] = useState<LangCode>("ru");
  const [drafts, setDrafts] = useState<Record<string, string>>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  const settingKey = `legal_${doc}_${lang}`;
  const value = drafts[settingKey] ?? "";

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDrafts((d) => ({ ...d, [settingKey]: e.target.value }));
    setStatus("idle");
  }

  function handleSave() {
    setStatus("saving");
    startTransition(async () => {
      const res = await saveLegalDocAction(settingKey, value);
      setStatus(res.ok ? "saved" : "error");
    });
  }

  return (
    <section className="rounded-[var(--radius-m)] border border-border bg-surface p-6 shadow-sm flex flex-col gap-5">
      <h2 className="font-display text-lg font-bold text-ink">Юридические документы</h2>

      {/* Doc selector */}
      <div className="flex flex-wrap gap-2">
        {DOCS.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => { setDoc(d.key); setStatus("idle"); }}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              doc === d.key
                ? "bg-ember text-white"
                : "bg-surface-2 text-ink-soft hover:text-ink"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Lang tabs */}
      <div className="flex gap-1 border-b border-border">
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => { setLang(l.code); setStatus("idle"); }}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              lang === l.code
                ? "border-ember text-ink"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-ink-faint">
          Текст документа. Разделяй разделы пустой строкой — каждый абзац будет отдельным параграфом.
        </p>
        <textarea
          value={value}
          onChange={handleChange}
          rows={18}
          placeholder="Введите текст документа..."
          className="w-full rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none font-mono leading-relaxed resize-y"
        />
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-[var(--radius-s)] bg-ember px-5 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {status === "saving" ? "Сохраняется…" : "Сохранить"}
        </button>
        {status === "saved" && <span className="text-sm text-spruce">Сохранено ✓</span>}
        {status === "error"  && <span className="text-sm text-danger">Ошибка при сохранении</span>}
      </div>
    </section>
  );
}
