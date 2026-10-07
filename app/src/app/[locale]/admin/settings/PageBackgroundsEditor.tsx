"use client";

import { useRef, useState, useTransition } from "react";
import { savePageBgAction, removePageBgAction } from "@/lib/settingsActions";
import { publicAssetUrl } from "@/lib/publicAssetUrl";

type PageEntry = {
  key: string;
  label: string;
  currentUrl: string | null;
};

export function PageBackgroundsEditor({ pages }: { pages: PageEntry[] }) {
  return (
    <section className="rounded-[var(--radius-m)] border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-1 font-display text-lg font-bold text-ink">Фон страниц</h2>
      <p className="mb-5 text-sm text-ink-faint">Изображение отображается как фон hero-секции на выбранной странице.</p>
      <div className="flex flex-col gap-4">
        {pages.map((p) => (
          <PageBgRow key={p.key} entry={p} />
        ))}
      </div>
    </section>
  );
}

function PageBgRow({ entry }: { entry: PageEntry }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(entry.currentUrl || null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreviewUrl(URL.createObjectURL(file));
    setStatus("idle");
  }

  function handleSave() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    formData.set("page", entry.key);
    setStatus("saving");
    startTransition(async () => {
      try {
        const result = await savePageBgAction(formData);
        if ("error" in result) setStatus("error");
        else { setPreviewUrl(result.url); setStatus("saved"); }
      } catch {
        setStatus("error");
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await removePageBgAction(entry.key);
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = "";
      setStatus("idle");
    });
  }

  return (
    <div className="rounded-[var(--radius-s)] border border-border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink">{entry.label}</span>
        {previewUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="text-xs font-semibold text-danger hover:underline disabled:opacity-50"
          >
            Удалить фон
          </button>
        )}
      </div>

      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={publicAssetUrl(previewUrl) ?? previewUrl}
          alt=""
          className="mb-3 h-28 w-full rounded-[var(--radius-s)] object-cover"
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="text-sm text-ink-soft file:mr-3 file:rounded-[var(--radius-s)] file:border file:border-border file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !inputRef.current?.files?.length}
          className="rounded-[var(--radius-s)] bg-ember px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-50"
        >
          {status === "saving" ? "…" : status === "saved" ? "Сохранено ✓" : "Загрузить"}
        </button>
        {status === "error" && <span className="text-sm text-danger">Ошибка</span>}
      </div>
    </div>
  );
}
