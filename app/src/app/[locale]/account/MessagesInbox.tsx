"use client";

import { useEffect, useRef } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { markUserMessagesReadAction } from "./messageActions";
import type { UserMessagePayload } from "@/lib/userMessages";

type MessageRow = {
  id: string;
  type: string;
  payload: UserMessagePayload;
  readAt: string | null;
  createdAt: string;
};

export function MessagesInbox({ messages }: { messages: MessageRow[] }) {
  const t = useTranslations("Account");
  const format = useFormatter();
  const router = useRouter();
  const markedKey = useRef<string>("");

  useEffect(() => {
    const ids = messages.filter((message) => message.readAt == null).map((message) => message.id);
    const key = ids.join(",");
    if (ids.length === 0 || markedKey.current === key) return;
    markedKey.current = key;
    void markUserMessagesReadAction(ids).then(() => router.refresh());
  }, [messages, router]);

  if (messages.length === 0) {
    return (
      <p className="rounded-[var(--radius-m)] border border-dashed border-border p-6 text-center text-sm text-ink-faint">
        {t("messagesEmpty")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {messages.map((message) => {
        const amount =
          message.payload.amount != null
            ? format.number(message.payload.amount, {
                style: "currency",
                currency: "KZT",
                maximumFractionDigits: 0,
              })
            : "";
        const unread = message.readAt == null;
        return (
          <li
            key={message.id}
            className={`rounded-[var(--radius-m)] border px-4 py-3 ${
              unread ? "border-ember/40 bg-ember/5" : "border-border bg-surface"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-ink">{t(`message_${message.type}_title`)}</p>
              {unread && (
                <span className="shrink-0 rounded-full bg-ember px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  {t("messagesUnread")}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              {t(`message_${message.type}_body`, {
                race: message.payload.race,
                amount,
                applicant: message.payload.applicant ?? "",
              })}
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              {format.dateTime(new Date(message.createdAt), {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
