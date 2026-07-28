"use client";

import { useState, useActionState, useTransition } from "react";
import { updateAboutAction, uploadPhotoLinkCoverAction } from "../actions";
import type { PhotoLink } from "@/types/eventContent";
import type { ActionState } from "../actions";

type Props = {
  eventId: string;
  initialAboutText: string;
  initialPhotoLinks: PhotoLink[];
};

export function AboutSection({ eventId, initialAboutText, initialPhotoLinks }: Props) {
  const [aboutText, setAboutText] = useState(initialAboutText);
  const [links, setLinks] = useState<PhotoLink[]>(initialPhotoLinks);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadPending, startUpload] = useTransition();

  const action = updateAboutAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  function handleCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setCoverFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setCoverPreview(null);
    }
  }

  function addLink() {
    const trimUrl = newUrl.trim();
    const trimLabel = newLabel.trim();
    if (!trimUrl || !trimLabel) return;

    if (coverFile) {
      const fd = new FormData();
      fd.set("cover", coverFile);
      startUpload(async () => {
        const result = await uploadPhotoLinkCoverAction(eventId, fd);
        setLinks((prev) => [...prev, { url: trimUrl, label: trimLabel, coverUrl: result.url }]);
        setNewUrl("");
        setNewLabel("");
        setCoverFile(null);
        setCoverPreview(null);
      });
    } else {
      setLinks((prev) => [...prev, { url: trimUrl, label: trimLabel }]);
      setNewUrl("");
      setNewLabel("");
    }
  }

  function removeLink(i: number) {
    setLinks((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ink-soft">Текст о забеге</label>
        <textarea
          value={aboutText}
          onChange={(e) => setAboutText(e.target.value)}
          rows={6}
          maxLength={4000}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-ember"
          placeholder="Расскажите о забеге — история, особенности трассы, атмосфера…"
        />
        <div className="text-right text-xs text-ink-faint">{aboutText.length}/4000</div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-xs font-semibold text-ink-soft">Ссылки на фото с прошлых мероприятий</div>

        {links.length > 0 && (
          <div className="flex flex-col gap-2">
            {links.map((link, i) => (
              <div key={i} className="flex items-center gap-3 rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-2">
                {link.coverUrl ? (
                  <img src={link.coverUrl} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
                ) : (
                  <div className="h-10 w-16 shrink-0 rounded bg-surface-2 border border-border" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">{link.label}</div>
                  <div className="truncate text-xs text-ink-faint">{link.url}</div>
                </div>
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  className="shrink-0 text-xs text-danger hover:underline"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-[var(--radius-s)] border border-dashed border-border p-3">
          <div className="text-xs font-semibold text-ink-faint">Добавить ссылку</div>
          <div className="flex gap-2">
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://yadi.sk/… или ссылка на альбом"
              className="flex-1 rounded-[var(--radius-s)] border border-border bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ember"
            />
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              maxLength={80}
              placeholder="Название (напр. «2025»)"
              className="w-40 rounded-[var(--radius-s)] border border-border bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ember"
            />
          </div>
          <div className="flex items-center gap-3">
            {coverPreview ? (
              <div className="relative">
                <img src={coverPreview} alt="" className="h-14 w-20 rounded object-cover" />
                <button
                  type="button"
                  onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white"
                >✕</button>
              </div>
            ) : (
              <label className="cursor-pointer rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-ink">
                + Обложка
                <input type="file" accept="image/*" className="sr-only" onChange={handleCoverPick} />
              </label>
            )}
            <button
              type="button"
              onClick={addLink}
              disabled={!newUrl || !newLabel || uploadPending}
              className="rounded-[var(--radius-s)] border border-border px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-2 disabled:opacity-50"
            >
              {uploadPending ? "Загружается…" : "+ Добавить"}
            </button>
          </div>
        </div>
      </div>

      <form action={formAction}>
        <input type="hidden" name="aboutText" value={aboutText} />
        <input type="hidden" name="photoLinks" value={JSON.stringify(links)} />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-50"
          >
            {pending ? "Сохранение…" : "Сохранить"}
          </button>
          {state.success && <span className="text-sm text-spruce">Сохранено</span>}
          {state.error && <span className="text-sm text-danger">Ошибка: {state.error}</span>}
        </div>
      </form>
    </div>
  );
}
