"use client";

import { useState, useTransition } from "react";
import { createVolunteerTopicAction, deleteVolunteerTopicAction } from "./telegramActions";

export function TelegramTopicSection({
  eventId,
  initialTopicId,
  initialChatUrl,
}: {
  eventId: string;
  initialTopicId: number | null;
  initialChatUrl: string | null;
}) {
  const [topicId, setTopicId] = useState(initialTopicId);
  const [chatUrl, setChatUrl] = useState(initialChatUrl);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const res = await createVolunteerTopicAction(eventId);
      if (res.ok && res.chatUrl) {
        setChatUrl(res.chatUrl);
        setTopicId(1); // реальный ID обновится при revalidate
      } else {
        setError(
          res.error === "not_configured"
            ? "TELEGRAM_BOT_TOKEN или VOLUNTEER_TG_CHAT_ID не настроены в .env"
            : res.error === "already_exists"
              ? "Топик уже создан"
              : "Ошибка Telegram API. Убедитесь что группа — форум-супергруппа и бот — администратор.",
        );
      }
    });
  }

  function handleDelete() {
    if (!confirm("Удалить топик и ссылку? Участники потеряют доступ к чату.")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteVolunteerTopicAction(eventId);
      if (res.ok) {
        setTopicId(null);
        setChatUrl(null);
      } else {
        setError("Ошибка при удалении топика");
      }
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-lg font-bold text-ink">Telegram-чат волонтёров</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Создаёт отдельный топик в форум-группе волонтёров. Одобренные волонтёры увидят ссылку в личном кабинете.
        </p>
      </div>

      {topicId ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-m)] border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              ✓ Топик создан
            </p>
            {chatUrl && (
              <a
                href={chatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 block truncate text-xs text-emerald-600 hover:underline dark:text-emerald-400"
              >
                {chatUrl}
              </a>
            )}
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="rounded-[var(--radius-s)] border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400"
          >
            {isPending ? "…" : "Удалить топик"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={handleCreate}
          className="self-start rounded-[var(--radius-s)] bg-[#229ED9] px-5 py-3 text-sm font-bold text-white hover:bg-[#1a8bbf] disabled:opacity-50"
        >
          {isPending ? "Создаём…" : "Создать Telegram-топик →"}
        </button>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </section>
  );
}
