"use client";

import { useState, useTransition } from "react";
import {
  uploadRegulationFileAction,
  removeRegulationFileAction,
  uploadWaiverFileAction,
  removeWaiverFileAction,
  updateRegulationBlocksAction,
} from "../actions";
import type { RegulationFile, RegulationBlock, RegulationLocale } from "@/types/regulation";

const LOCALES: { value: RegulationLocale; label: string }[] = [
  { value: "ru", label: "RU" },
  { value: "kk", label: "KK" },
  { value: "en", label: "EN" },
];

const LOCALE_LABELS: Record<RegulationLocale, string> = { ru: "Русский", kk: "Қазақша", en: "English" };

type Props = {
  eventId: string;
  initialFiles: RegulationFile[];
  initialBlocks: RegulationBlock[];
  initialWaiverFiles: RegulationFile[];
};

function emptyBlock(): RegulationBlock {
  return {
    id: Math.random().toString(36).slice(2),
    order: Date.now(),
    title: { ru: "", kk: "", en: "" },
    content: { ru: "", kk: "", en: "" },
  };
}

// ── Files ────────────────────────────────────────────────────────────────────

function FilesEditor({ eventId, initialFiles }: { eventId: string; initialFiles: RegulationFile[] }) {
  const [files, setFiles] = useState<RegulationFile[]>(initialFiles);
  const [locale, setLocale] = useState<RegulationLocale>("ru");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<{ error?: string; success?: boolean }>({});
  const [uploadPending, startUpload] = useTransition();
  const [removePending, startRemove] = useTransition();

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("locale", locale);
    fd.set("name", name || file.name);
    setStatus({});
    startUpload(async () => {
      const result = await uploadRegulationFileAction(eventId, {}, fd);
      setStatus(result);
      if (result.success) {
        setFiles((prev) => [...prev, { locale, name: name || file.name, url: "" }]);
        setName("");
      }
    });
    e.target.value = "";
  }

  function handleRemove(url: string) {
    const fd = new FormData();
    fd.set("url", url);
    startRemove(async () => {
      await removeRegulationFileAction(eventId, {}, fd);
      setFiles((prev) => prev.filter((f) => f.url !== url));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-bold uppercase tracking-wide text-ink-faint">Файлы регламента</div>

      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 rounded-[var(--radius-s)] border border-border px-3 py-2 text-sm">
              <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-faint">
                {f.locale}
              </span>
              {f.url ? (
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate font-medium text-ember hover:underline">
                  {f.name}
                </a>
              ) : (
                <span className="flex-1 truncate font-medium text-ink">{f.name}</span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(f.url)}
                disabled={removePending}
                className="shrink-0 text-xs text-danger hover:underline disabled:opacity-50"
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-[var(--radius-s)] border border-dashed border-border p-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink-faint">Язык</label>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as RegulationLocale)}
            className="rounded border border-border bg-surface px-2 py-1.5 text-sm focus:border-ember focus:outline-none"
          >
            {LOCALES.map((l) => <option key={l.value} value={l.value}>{l.label} — {LOCALE_LABELS[l.value]}</option>)}
          </select>
        </div>
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <label className="text-xs text-ink-faint">Название (необязательно)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Регламент 2026"
            className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm focus:border-ember focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink-faint">Файл (PDF, DOCX)</label>
          <label className={`cursor-pointer rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-ink-soft ${uploadPending ? "opacity-50" : ""}`}>
            {uploadPending ? "Загружается…" : "Выбрать файл"}
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={handleUpload}
              disabled={uploadPending}
            />
          </label>
        </div>
        {status.success && <span className="self-end text-sm text-spruce">Загружено ✓</span>}
        {status.error && <span className="self-end text-sm text-danger">Ошибка: {status.error}</span>}
      </div>
    </div>
  );
}

// ── Waiver Files ─────────────────────────────────────────────────────────────

function WaiverFilesEditor({ eventId, initialFiles }: { eventId: string; initialFiles: RegulationFile[] }) {
  const [files, setFiles] = useState<RegulationFile[]>(initialFiles);
  const [locale, setLocale] = useState<RegulationLocale>("ru");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<{ error?: string; success?: boolean }>({});
  const [uploadPending, startUpload] = useTransition();
  const [removePending, startRemove] = useTransition();

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("locale", locale);
    fd.set("name", name || file.name);
    setStatus({});
    startUpload(async () => {
      const result = await uploadWaiverFileAction(eventId, {}, fd);
      setStatus(result);
      if (result.success) {
        setFiles((prev) => [...prev, { locale, name: name || file.name, url: "" }]);
        setName("");
      }
    });
    e.target.value = "";
  }

  function handleRemove(url: string) {
    const fd = new FormData();
    fd.set("url", url);
    startRemove(async () => {
      await removeWaiverFileAction(eventId, {}, fd);
      setFiles((prev) => prev.filter((f) => f.url !== url));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-bold uppercase tracking-wide text-ink-faint">Файлы расписки</div>

      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 rounded-[var(--radius-s)] border border-border px-3 py-2 text-sm">
              <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-faint">
                {f.locale}
              </span>
              {f.url ? (
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate font-medium text-ember hover:underline">
                  {f.name}
                </a>
              ) : (
                <span className="flex-1 truncate font-medium text-ink">{f.name}</span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(f.url)}
                disabled={removePending}
                className="shrink-0 text-xs text-danger hover:underline disabled:opacity-50"
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-[var(--radius-s)] border border-dashed border-border p-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink-faint">Язык</label>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as RegulationLocale)}
            className="rounded border border-border bg-surface px-2 py-1.5 text-sm focus:border-ember focus:outline-none"
          >
            {LOCALES.map((l) => <option key={l.value} value={l.value}>{l.label} — {LOCALE_LABELS[l.value]}</option>)}
          </select>
        </div>
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <label className="text-xs text-ink-faint">Название (необязательно)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Расписка 2026"
            className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm focus:border-ember focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink-faint">Файл (PDF, DOCX)</label>
          <label className={`cursor-pointer rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-ink-soft ${uploadPending ? "opacity-50" : ""}`}>
            {uploadPending ? "Загружается…" : "Выбрать файл"}
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={handleUpload}
              disabled={uploadPending}
            />
          </label>
        </div>
        {status.success && <span className="self-end text-sm text-spruce">Загружено ✓</span>}
        {status.error && <span className="self-end text-sm text-danger">Ошибка: {status.error}</span>}
      </div>
    </div>
  );
}

// ── Blocks ────────────────────────────────────────────────────────────────────

function BlocksEditor({ eventId, initialBlocks }: { eventId: string; initialBlocks: RegulationBlock[] }) {
  const [blocks, setBlocks] = useState<RegulationBlock[]>(initialBlocks);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ error?: string; success?: boolean }>({});
  const [isPending, startTransition] = useTransition();

  function addBlock() {
    const b = emptyBlock();
    setBlocks((prev) => [...prev, b]);
    setExpandedId(b.id);
    setStatus({});
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (expandedId === id) setExpandedId(null);
    setStatus({});
  }

  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
    setStatus({});
  }

  function updateBlock(id: string, field: "title" | "content", lang: RegulationLocale, value: string) {
    setBlocks((prev) =>
      prev.map((b) => b.id === id ? { ...b, [field]: { ...b[field], [lang]: value } } : b)
    );
    setStatus({});
  }

  function save() {
    const fd = new FormData();
    fd.set("blocks", JSON.stringify(blocks));
    setStatus({});
    startTransition(async () => {
      const result = await updateRegulationBlocksAction(eventId, {}, fd);
      setStatus(result);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-bold uppercase tracking-wide text-ink-faint">Блоки контента</div>

      {blocks.map((b, idx) => {
        const isOpen = expandedId === b.id;
        const previewTitle = b.title.ru || b.title.en || b.title.kk || "Новый блок";
        return (
          <div key={b.id} className="rounded-[var(--radius-s)] border border-border">
            <div className="flex items-center gap-1 px-2 py-2">
              {/* Up / Down */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => moveBlock(b.id, -1)}
                  disabled={idx === 0}
                  className="flex h-5 w-5 items-center justify-center rounded text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-20"
                  aria-label="Вверх"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(b.id, 1)}
                  disabled={idx === blocks.length - 1}
                  className="flex h-5 w-5 items-center justify-center rounded text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-20"
                  aria-label="Вниз"
                >
                  ▼
                </button>
              </div>
              {/* Toggle */}
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : b.id)}
                className="flex-1 min-w-0 text-left text-sm font-semibold text-ink px-1"
              >
                <span className="mr-1.5 text-ink-faint">{isOpen ? "▾" : "▸"}</span>
                <span className="truncate">{previewTitle}</span>
              </button>
              <span className="shrink-0 text-xs text-ink-faint tabular-nums mr-1">{idx + 1}/{blocks.length}</span>
              <button type="button" onClick={() => removeBlock(b.id)} className="shrink-0 text-xs text-danger hover:underline px-1">
                Удалить
              </button>
            </div>

            {isOpen && (
              <div className="flex flex-col gap-4 border-t border-border p-4">
                {LOCALES.map(({ value: lang, label }) => (
                  <div key={lang} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-faint">{label}</span>
                      <span className="text-xs text-ink-faint">{LOCALE_LABELS[lang]}</span>
                    </div>
                    <input
                      type="text"
                      value={b.title[lang]}
                      onChange={(e) => updateBlock(b.id, "title", lang, e.target.value)}
                      placeholder="Заголовок блока"
                      maxLength={200}
                      className="w-full rounded border border-border bg-surface px-3 py-2 text-sm font-semibold focus:border-ember focus:outline-none"
                    />
                    <textarea
                      value={b.content[lang]}
                      onChange={(e) => updateBlock(b.id, "content", lang, e.target.value)}
                      placeholder="Текст блока…"
                      rows={4}
                      maxLength={3000}
                      className="w-full resize-y rounded border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-ink focus:border-ember focus:outline-none"
                    />
                    <div className="text-right text-[10px] text-ink-faint tabular-nums">
                      {b.content[lang].length}/3000
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <button type="button" onClick={addBlock} className="self-start text-sm font-semibold text-ink-soft hover:text-ink">
        + Добавить блок
      </button>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-[var(--radius-s)] border border-border bg-surface-2 px-4 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-ink-soft disabled:opacity-50"
        >
          {isPending ? "Сохраняется…" : "Сохранить блоки"}
        </button>
        {status.success && <span className="text-sm text-spruce">Сохранено ✓</span>}
        {status.error && <span className="text-sm text-danger">Ошибка</span>}
      </div>
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export function RegulationsSection({ eventId, initialFiles, initialBlocks, initialWaiverFiles }: Props) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="font-display text-lg font-bold text-ink">Документы</h2>
      <div className="flex flex-col gap-2">
        <div className="text-sm font-semibold text-ink">Положение</div>
        <FilesEditor eventId={eventId} initialFiles={initialFiles} />
        <BlocksEditor eventId={eventId} initialBlocks={initialBlocks} />
      </div>
      <div className="flex flex-col gap-2 border-t border-border pt-6">
        <div className="text-sm font-semibold text-ink">Расписка</div>
        <WaiverFilesEditor eventId={eventId} initialFiles={initialWaiverFiles} />
      </div>
    </section>
  );
}
