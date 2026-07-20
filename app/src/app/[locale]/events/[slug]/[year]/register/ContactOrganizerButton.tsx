"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { sendMessageToOrganizerAction } from "./contactActions";

export function ContactOrganizerButton({ eventId }: { eventId: string }) {
  const t = useTranslations("Registration");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    setSent(false);
    setError(null);
    setMessage("");
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function submit() {
    startTransition(async () => {
      const result = await sendMessageToOrganizerAction(eventId, message);
      if (result.ok) {
        setSent(true);
      } else {
        setError(t("contactOrganizerError"));
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="rounded-[var(--radius-s)] border border-border px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-2"
      >
        {t("contactOrganizerCta")}
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => { if (e.target === dialogRef.current) close(); }}
        className="w-full max-w-md rounded-[var(--radius-m)] border border-border bg-surface p-0 shadow-xl backdrop:bg-black/40 open:flex open:flex-col"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-base font-bold text-ink">{t("contactOrganizerTitle")}</h2>
          <button type="button" onClick={close} className="text-ink-faint hover:text-ink" aria-label="Закрыть">✕</button>
        </div>

        {sent ? (
          <div className="px-5 py-8 text-center">
            <p className="text-2xl">✓</p>
            <p className="mt-2 font-semibold text-ink">{t("contactOrganizerSentTitle")}</p>
            <p className="mt-1 text-sm text-ink-soft">{t("contactOrganizerSentText")}</p>
            <button
              type="button"
              onClick={close}
              className="mt-5 rounded-[var(--radius-s)] bg-ember px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
            >
              {t("contactOrganizerClose")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-5 py-5">
            <p className="text-sm text-ink-soft">{t("contactOrganizerLead")}</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("contactOrganizerPlaceholder")}
              rows={5}
              maxLength={1000}
              className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ember focus:ring-1 focus:ring-ember"
            />
            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={close} className="px-4 py-2 text-sm font-semibold text-ink-faint hover:text-ink">
                {t("contactOrganizerCancel")}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || message.trim().length < 5}
                className="rounded-[var(--radius-s)] bg-ember px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {pending ? t("contactOrganizerSending") : t("contactOrganizerSend")}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
