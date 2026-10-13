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
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
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
      <p className="text-xs text-ink-soft">
        {isPublished
          ? "Событие отображается на сайте для всех посетителей."
          : "Событие скрыто — видно только в админке."}
      </p>
      {state.error === "unauthorized" && (
        <p className="w-full text-sm text-danger">Нет прав для публикации.</p>
      )}
    </div>
  );
}
