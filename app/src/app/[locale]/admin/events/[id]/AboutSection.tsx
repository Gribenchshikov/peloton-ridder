"use client";

import { useState, useActionState } from "react";
import { updateAboutAction } from "../actions";
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

  const action = updateAboutAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  function addLink() {
    const trimUrl = newUrl.trim();
    const trimLabel = newLabel.trim();
    if (!trimUrl || !trimLabel) return;
    setLinks((prev) => [...prev, { url: trimUrl, label: trimLabel }]);
    setNewUrl("");
    setNewLabel("");
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

      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold text-ink-soft">Ссылки на фото с прошлых мероприятий</div>
        {links.map((link, i) => (
          <div key={i} className="flex items-center gap-2 rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-2 text-sm">
            <span className="flex-1 truncate text-ink">{link.label}</span>
            <span className="truncate text-xs text-ink-faint">{link.url}</span>
            <button
              type="button"
              onClick={() => removeLink(i)}
              className="shrink-0 text-xs text-danger hover:underline"
            >
              Удалить
            </button>
          </div>
        ))}
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
            placeholder="Название (напр. «2025 — фотоальбом»)"
            className="w-52 rounded-[var(--radius-s)] border border-border bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ember"
          />
          <button
            type="button"
            onClick={addLink}
            className="shrink-0 rounded-[var(--radius-s)] border border-border px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-2"
          >
            + Добавить
          </button>
        </div>
      </div>

      <form
        action={formAction}
        onSubmit={(e) => {
          const fd = new FormData(e.currentTarget);
          fd.set("aboutText", aboutText);
          fd.set("photoLinks", JSON.stringify(links));
          e.preventDefault();
          formAction(fd);
        }}
      >
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
