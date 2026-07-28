"use client";

import { useState, useTransition } from "react";
import { uploadEventPhotoAction, deleteEventPhotoAction } from "../actions";

type Props = {
  eventId: string;
  initialPhotos: string[];
};

export function PhotosSection({ eventId, initialPhotos }: Props) {
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [uploadStatus, setUploadStatus] = useState<{ error?: string }>({});
  const [isPending, startTransition] = useTransition();

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    for (const file of files) {
      const fd = new FormData();
      fd.set("photo", file);
      setUploadStatus({});
      startTransition(async () => {
        const result = await uploadEventPhotoAction(eventId, {}, fd);
        if (result.success && result.url) {
          setPhotos((prev) => [...prev, result.url!]);
        } else {
          setUploadStatus({ error: result.error });
        }
      });
    }
  }

  function handleDelete(url: string) {
    const fd = new FormData();
    fd.set("url", url);
    startTransition(async () => {
      const result = await deleteEventPhotoAction(eventId, {}, fd);
      if (result.success) setPhotos((prev) => prev.filter((u) => u !== url));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold text-ink-soft">Фото события (lightbox)</div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((url) => (
            <div key={url} className="group relative overflow-hidden rounded-[var(--radius-s)]">
              <img src={url} alt="" className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => handleDelete(url)}
                className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      )}

      <label className={`cursor-pointer self-start rounded-[var(--radius-s)] border border-dashed border-border px-4 py-2 text-sm font-semibold text-ink-faint transition-colors hover:border-ink-soft hover:text-ink ${isPending ? "opacity-50" : ""}`}>
        {isPending ? "Загружается…" : "+ Добавить фото"}
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={handleUpload}
          disabled={isPending}
        />
      </label>
      {uploadStatus.error && <p className="text-sm text-danger">Ошибка загрузки</p>}
    </div>
  );
}
