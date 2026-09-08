"use client";

import { useActionState, useState } from "react";
import { togglePublishedAction } from "./publishAction";

export function PublishToggle({ eventId, initialIsPublished }: { eventId: string; initialIsPublished: boolean }) {
  const [isPublished, setIsPublished] = useState(initialIsPublished);

  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string }, formData: FormData) => {
      const result = await togglePublishedAction(eventId, prev, formData);
      if (result.ok && result.isPublished !== undefined) {
        setIsPublished(result.isPublished);
      }
      return result;
    },
    {},
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-ink">Публикация события</div>
          <div className="mt-0.5 text-xs text-ink-soft">
            {isPublished
              ? "Событие отображается на сайте для всех посетителей."
              : "Событие скрыто — видно только в админке."}
          </div>
        </div>
        <form action={formAction}>
          <input type="hidden" name="publish" value={isPublished ? "0" : "1"} />
          <button
            type="submit"
            disabled={pending}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors disabled:opacity-50 ${
              isPublished
                ? "bg-spruce/10 text-spruce hover:bg-spruce/20"
                : "bg-ember/10 text-ember hover:bg-ember/20"
            }`}
          >
            {pending ? "…" : isPublished ? "Скрыть" : "Опубликовать"}
          </button>
        </form>
      </div>
      {state.error === "unauthorized" && (
        <p className="text-sm text-danger">Нет прав для публикации.</p>
      )}
    </section>
  );
}
