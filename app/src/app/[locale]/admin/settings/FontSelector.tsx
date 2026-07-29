"use client";

import { useState, useTransition, useRef } from "react";
import { saveFontAction, uploadFontAction } from "./actions";

const BUILTIN = [
  { key: "unbounded",  label: "Unbounded",  css: "'Unbounded', 'Arial Black', sans-serif" },
  { key: "oswald",     label: "Oswald",      css: "'Oswald', 'Arial Narrow', sans-serif" },
  { key: "bebas-neue", label: "Bebas Neue",  css: "'Bebas Neue', Impact, sans-serif" },
  { key: "impact",     label: "Impact",      css: "Impact, 'Arial Narrow', sans-serif" },
  { key: "georgia",    label: "Georgia",     css: "Georgia, 'Times New Roman', serif" },
] as const;

export function FontSelector({
  initial,
  initialCustomName,
  initialCustomCss,
}: {
  initial: string;
  initialCustomName: string | null;
  initialCustomCss: string | null;
}) {
  const [selected, setSelected] = useState(initial || "unbounded");
  const [customName, setCustomName] = useState(initialCustomName);
  const [customCss, setCustomCss] = useState(initialCustomCss);
  const [isPending, startTransition] = useTransition();
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  const previewCss =
    selected === "custom" && customCss
      ? customCss
      : BUILTIN.find((f) => f.key === selected)?.css ?? BUILTIN[0].css;

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelected(e.target.value);
    setSaveStatus("idle");
  }

  function handleSave() {
    setSaveStatus("idle");
    startTransition(async () => {
      const res = await saveFontAction(selected);
      setSaveStatus(res.ok ? "saved" : "error");
    });
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus("uploading");
    setSaveStatus("idle");
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", file.name.replace(/\.woff2$/i, ""));
      const res = await uploadFontAction(fd);
      if (res.ok && res.name && res.css) {
        setCustomName(res.name);
        setCustomCss(res.css);
        setSelected("custom");
        setUploadStatus("done");
        setSaveStatus("saved");
      } else {
        setUploadStatus("error");
      }
    });
    e.target.value = "";
  }

  return (
    <section className="rounded-[var(--radius-m)] border border-border bg-surface p-6 shadow-sm flex flex-col gap-5">
      <div>
        <h2 className="font-display text-lg font-bold text-ink">Шрифт заголовков</h2>
        <p className="mt-1 text-xs text-ink-soft">Применяется ко всем заголовкам сайта.</p>
      </div>

      {/* Select */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-ink-faint uppercase tracking-wide">Шрифт</label>
        <select
          value={selected}
          onChange={handleSelect}
          disabled={isPending}
          className="w-full rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none disabled:opacity-50"
        >
          {BUILTIN.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
          {customName && (
            <option value="custom">{customName} (свой)</option>
          )}
        </select>
      </div>

      {/* Preview */}
      <div className="rounded-[var(--radius-s)] border border-dashed border-border bg-surface-2 px-5 py-4">
        <p className="text-[10px] uppercase tracking-widest text-ink-faint mb-1">Превью</p>
        <p
          className="text-3xl font-bold text-ink leading-none"
          style={{ fontFamily: previewCss }}
        >
          Peloton Ridder
        </p>
        <p
          className="mt-1 text-base text-ink-soft"
          style={{ fontFamily: previewCss }}
        >
          Горный ультрамарафон 2026
        </p>
      </div>

      {/* Upload custom font */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide">Свой шрифт</p>
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".woff2"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() => fileRef.current?.click()}
            className="rounded-[var(--radius-s)] border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-ink hover:border-ember hover:text-ember disabled:opacity-50 transition-colors"
          >
            Загрузить .woff2
          </button>
          {uploadStatus === "uploading" && <span className="text-xs text-ink-faint">Загружается…</span>}
          {uploadStatus === "done" && <span className="text-xs text-spruce">✓ Загружен: {customName}</span>}
          {uploadStatus === "error" && <span className="text-xs text-danger">Ошибка загрузки</span>}
          {uploadStatus === "idle" && customName && selected !== "custom" && (
            <span className="text-xs text-ink-faint">Уже загружен: {customName}</span>
          )}
        </div>
        <p className="text-[11px] text-ink-faint">Файл .woff2, до 5 МБ. После загрузки шрифт автоматически выбирается.</p>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-1 border-t border-border">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-[var(--radius-s)] bg-ember px-5 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          Сохранить
        </button>
        {saveStatus === "saved" && <span className="text-sm text-spruce">Сохранено ✓</span>}
        {saveStatus === "error"  && <span className="text-sm text-danger">Ошибка</span>}
      </div>
    </section>
  );
}
