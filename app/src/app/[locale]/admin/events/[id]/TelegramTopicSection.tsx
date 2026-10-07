"use client";

import { useState, useTransition } from "react";
import {
  createVolunteerTopicAction,
  deleteVolunteerTopicAction,
  saveVolunteerChatUrlAction,
} from "./telegramActions";
import { useEventSaveRegistration } from "./EventSaveBar";

export function TelegramTopicSection({
  eventId,
  initialTopicId,
  initialChatUrl,
  telegramConfigured,
}: {
  eventId: string;
  initialTopicId: number | null;
  initialChatUrl: string | null;
  telegramConfigured: boolean;
}) {
  const [topicId, setTopicId] = useState(initialTopicId);
  const [chatUrl, setChatUrl] = useState(initialChatUrl ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { hideInlineSave } = useEventSaveRegistration(`tg-chat-${eventId}`, async () => {
    const result = await saveVolunteerChatUrlAction(eventId, chatUrl);
    if (result.error) {
      setError(result.error === "invalid_url" ? "Укажите корректную ссылку (https://t.me/…)" : "Не удалось сохранить ссылку");
      return { error: result.error };
    }
    setError(null);
    setSaved(true);
    return { success: true };
  });

  function handleSaveUrl() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveVolunteerChatUrlAction(eventId, chatUrl);
      if (result.ok) {
        setSaved(true);
      } else {
        setError(result.error === "invalid_url" ? "Укажите корректную ссылку (https://t.me/…)" : "Не удалось сохранить ссылку");
      }
    });
  }

  function handleCreate() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await createVolunteerTopicAction(eventId);
      if (res.ok && res.chatUrl) {
        setChatUrl(res.chatUrl);
        setTopicId(1);
      } else {
        setError(
          res.error === "not_configured"
            ? "Бот не настроен: добавьте TELEGRAM_BOT_TOKEN и VOLUNTEER_TG_CHAT_ID в app/.env и перезапустите сервер. Пока можно вставить ссылку вручную."
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
    setSaved(false);
    startTransition(async () => {
      const res = await deleteVolunteerTopicAction(eventId);
      if (res.ok) {
        setTopicId(null);
        setChatUrl("");
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
          Ссылка увидят одобренные волонтёры в личном кабинете. Можно вставить приглашение вручную
          {telegramConfigured ? " или создать топик в группе бота." : "."}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ink-soft">Ссылка на чат</label>
        <input
          type="url"
          value={chatUrl}
          onChange={(e) => {
            setChatUrl(e.target.value);
            setSaved(false);
          }}
          placeholder="https://t.me/+…"
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ember"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!hideInlineSave && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleSaveUrl}
            className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white hover:bg-ember-strong disabled:opacity-50"
          >
            {isPending ? "Сохранение…" : "Сохранить ссылку"}
          </button>
        )}
        {telegramConfigured && !topicId && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleCreate}
            className="rounded-[var(--radius-s)] bg-[#229ED9] px-4 py-2 text-sm font-bold text-white hover:bg-[#1a8bbf] disabled:opacity-50"
          >
            {isPending ? "Создаём…" : "Создать топик ботом"}
          </button>
        )}
        {topicId ? (
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="rounded-[var(--radius-s)] border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {isPending ? "…" : "Удалить топик"}
          </button>
        ) : null}
        {saved && <span className="text-sm text-spruce">Сохранено</span>}
      </div>

      {!telegramConfigured && (
        <p className="text-xs text-ink-faint">
          Автосоздание топика выключено: в <code className="font-mono">app/.env</code> нет{" "}
          <code className="font-mono">TELEGRAM_BOT_TOKEN</code> и{" "}
          <code className="font-mono">VOLUNTEER_TG_CHAT_ID</code>. Для локальных тестов достаточно ссылки выше.
        </p>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </section>
  );
}
