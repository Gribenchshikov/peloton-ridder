"use client";

import { useRef, useState, useTransition } from "react";
import { saveHeroBgAction, removeHeroBgAction } from "@/lib/settingsActions";
import { publicAssetUrl } from "@/lib/publicAssetUrl";

type Props = {
  currentUrl: string | null;
  labels: {
    heroLabel: string;
    save: string;
    saved: string;
    error: string;
    current: string;
    remove: string;
  };
};

export function SettingsView({ currentUrl, labels }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreviewUrl(URL.createObjectURL(file));
  }

  function handleSave() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    setStatus("saving");
    startTransition(async () => {
      const result = await saveHeroBgAction(formData);
      if ("error" in result) {
        setStatus("error");
      } else {
        setPreviewUrl(result.url);
        setStatus("saved");
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await removeHeroBgAction();
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = "";
      setStatus("idle");
    });
  }

  return (
    <section className="rounded-[var(--radius-m)] border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-4 font-display text-lg font-bold text-ink">{labels.heroLabel}</h2>

      {previewUrl && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{labels.current}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={publicAssetUrl(previewUrl) ?? previewUrl}
            alt="Hero background"
            className="h-48 w-full rounded-[var(--radius-s)] object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="mt-2 text-sm font-semibold text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            {labels.remove}
          </button>
        </div>
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
          disabled={isPending}
          className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-50"
        >
          {status === "saving" ? "…" : status === "saved" ? labels.saved : labels.save}
        </button>
        {status === "error" && (
          <span className="text-sm text-red-500">{labels.error}</span>
        )}
      </div>
    </section>
  );
}
