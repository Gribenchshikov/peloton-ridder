"use client";

import { useState, useActionState, useTransition } from "react";
import { updateMediaLinksAction, uploadPhotoLinkCoverAction } from "../actions";
import { useEventSaveRegistration } from "./EventSaveBar";
import type { PhotoLink, MediaKind } from "@/types/eventContent";
import { mediaKind } from "@/types/eventContent";
import type { ActionState } from "../actions";
import { publicAssetUrl } from "@/lib/publicAssetUrl";

type Props = {
  eventId: string;
  initialLinks: PhotoLink[];
};

function inferKind(url: string): MediaKind {
  const value = url.toLowerCase();
  if (/youtube\.com|youtu\.be|vimeo\.com|rutube\.ru|vkvideo\.ru|vk\.com\/video|\/video/.test(value)) {
    return "video";
  }
  return "photo";
}

export function MediaLinksSection({ eventId, initialLinks }: Props) {
  const [links, setLinks] = useState<PhotoLink[]>(initialLinks);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newKind, setNewKind] = useState<MediaKind>("photo");
  const [kindTouched, setKindTouched] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadPending, startUpload] = useTransition();

  const action = updateMediaLinksAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [bulkState, setBulkState] = useState<ActionState>({});
  const displayState = bulkState.error || bulkState.success ? bulkState : state;
  const { hideInlineSave } = useEventSaveRegistration(`media-${eventId}`, async () => {
    let nextLinks = links;
    const trimUrl = newUrl.trim();
    const trimLabel = newLabel.trim();
    if (trimUrl && trimLabel) {
      let coverUrl: string | undefined;
      if (coverFile) {
        const coverFd = new FormData();
        coverFd.set("cover", coverFile);
        const uploaded = await uploadPhotoLinkCoverAction(eventId, coverFd);
        coverUrl = uploaded.url;
      }
      nextLinks = [...links, { url: trimUrl, label: trimLabel, kind: newKind, ...(coverUrl ? { coverUrl } : {}) }];
      setLinks(nextLinks);
      resetDraft();
    }
    const fd = new FormData();
    fd.set("photoLinks", JSON.stringify(nextLinks));
    const result = await updateMediaLinksAction(eventId, {}, fd);
    setBulkState(result);
    return result;
  });

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

  function handleUrlChange(value: string) {
    setNewUrl(value);
    if (!kindTouched) setNewKind(inferKind(value));
  }

  function resetDraft() {
    setNewUrl("");
    setNewLabel("");
    setNewKind("photo");
    setKindTouched(false);
    setCoverFile(null);
    setCoverPreview(null);
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
        setLinks((prev) => [...prev, { url: trimUrl, label: trimLabel, kind: newKind, coverUrl: result.url }]);
        resetDraft();
      });
    } else {
      setLinks((prev) => [...prev, { url: trimUrl, label: trimLabel, kind: newKind }]);
      resetDraft();
    }
  }

  function removeLink(i: number) {
    setLinks((prev) => prev.filter((_, idx) => idx !== i));
  }

  function move(i: number, dir: -1 | 1) {
    setLinks((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs font-semibold text-ink-soft">Ссылки на фотоальбомы и видео</div>

      {links.length > 0 && (
        <div className="flex flex-col gap-2">
          {links.map((link, i) => (
            <div key={`${link.url}-${i}`} className="flex items-center gap-3 rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-2">
              {link.coverUrl ? (
                <img src={publicAssetUrl(link.coverUrl) ?? link.coverUrl} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
              ) : (
                <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded border border-border bg-surface text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                  {mediaKind(link) === "video" ? "видео" : "фото"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                    {mediaKind(link) === "video" ? "Видео" : "Фото"}
                  </span>
                  <div className="truncate text-sm font-semibold text-ink">{link.label}</div>
                </div>
                <div className="truncate text-xs text-ink-faint">{link.url}</div>
              </div>
              <div className="flex shrink-0 flex-col gap-0.5">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-xs text-ink-faint hover:text-ink disabled:opacity-30">▲</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === links.length - 1} className="text-xs text-ink-faint hover:text-ink disabled:opacity-30">▼</button>
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
        <div className="flex gap-1.5">
          {(["photo", "video"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => { setNewKind(kind); setKindTouched(true); }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                newKind === kind ? "bg-ember text-white" : "bg-surface-2 text-ink-soft hover:text-ink"
              }`}
            >
              {kind === "photo" ? "Фото" : "Видео"}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder={newKind === "video" ? "https://youtu.be/… или ссылка на ролик" : "https://yadi.sk/… или ссылка на альбом"}
            className="flex-1 rounded-[var(--radius-s)] border border-border bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ember"
          />
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            maxLength={80}
            placeholder="Название"
            className="sm:w-44 rounded-[var(--radius-s)] border border-border bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ember"
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

      <form action={formAction}>
        <input type="hidden" name="photoLinks" value={JSON.stringify(links)} />
        <div className="flex items-center gap-3">
          {!hideInlineSave && (
          <button
            type="submit"
            disabled={pending}
            className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-50"
          >
            {pending ? "Сохранение…" : "Сохранить ссылки"}
          </button>
          )}
          {displayState.success && <span className="text-sm text-spruce">Сохранено</span>}
          {displayState.error && <span className="text-sm text-danger">Ошибка: {displayState.error}</span>}
        </div>
      </form>
    </div>
  );
}
