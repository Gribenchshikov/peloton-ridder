"use client";

import { useActionState, useRef, useState } from "react";
import { uploadAvatarAction, type AvatarState } from "./avatarAction";

export function AvatarUpload({ initialUrl, name }: { initialUrl: string | null; name: string }) {
  const [state, formAction, pending] = useActionState(uploadAvatarAction, {});
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUrl = state.url ?? preview;
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      e.target.form?.requestSubmit();
    }
  }

  return (
    <form action={formAction} className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full focus:outline-none"
        title="Изменить фото"
      >
        {currentUrl ? (
          <img src={currentUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-ember text-xl font-bold text-white">
            {initials}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-disabled:opacity-0">
          <span className="text-sm font-bold text-white">{pending ? "…" : "✎"}</span>
        </div>
      </button>
      {(state.error === "tooLarge" || state.error === "invalidType") && (
        <p className="text-xs text-danger">
          {state.error === "tooLarge" ? "Макс. 5 МБ" : "JPEG / PNG / WebP"}
        </p>
      )}
      <input
        ref={inputRef}
        name="avatar"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleChange}
      />
    </form>
  );
}
