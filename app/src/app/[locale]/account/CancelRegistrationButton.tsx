"use client";

import { useState, useActionState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { userCancelRegistrationAction } from "./actions";

const CANCEL_REASONS = [
  "INJURY",
  "CANT_ATTEND",
  "FINANCIAL",
  "FAMILY",
  "CONFLICT",
  "NOT_READY",
  "DEFER",
  "OTHER",
] as const;

type Props = { registrationId: string };

export function CancelRegistrationButton({ registrationId }: Props) {
  const t = useTranslations("Account");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(userCancelRegistrationAction, {});

  function handleOpen() {
    setReason("");
    setComment("");
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reason) return;
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  }

  if (state.success) {
    return <span className="text-xs font-semibold text-ink-faint">{t("cancelledLabel")}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="text-xs font-semibold text-danger hover:underline"
      >
        {t("cancelCta")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-[var(--radius-l)] border border-border bg-surface p-6 shadow-xl">
            <h2 className="mb-1 font-display text-lg font-bold text-ink">{t("cancelDialogTitle")}</h2>
            <p className="mb-5 text-sm text-ink-soft">{t("cancelDialogDesc")}</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input type="hidden" name="registrationId" value={registrationId} />

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wide text-ink-faint">
                  {t("cancelReasonLabel")}
                </label>
                {CANCEL_REASONS.map((r) => (
                  <label key={r} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
                    <input
                      type="radio"
                      name="cancelReason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="h-4 w-4 accent-ember"
                    />
                    {t(`cancelReason_${r}`)}
                  </label>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-ink-faint">
                  {t("cancelCommentLabel")}
                </label>
                <textarea
                  name="cancelComment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t("cancelCommentPlaceholder")}
                  rows={3}
                  maxLength={500}
                  className="w-full resize-y rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
                />
              </div>

              {state.error && (
                <p className="text-sm text-danger">{t(`cancelError_${state.error}`)}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={!reason || isPending}
                  className="rounded-[var(--radius-s)] bg-danger px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {isPending ? t("cancelConfirmingCta") : t("cancelConfirmCta")}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--radius-s)] border border-border px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
                >
                  {t("cancelAbortCta")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
