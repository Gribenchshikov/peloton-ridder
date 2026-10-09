"use client";

import { useEffect, useState, useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { requestRefundAction, type RequestRefundState } from "./actions";

export type RefundRequestView = {
  type: "SLOT" | "TRANSFER";
  status: "PENDING" | "CONFIRMED" | "REJECTED";
};

type Props = {
  registrationId: string;
  hasTransfer: boolean;
  requests: RefundRequestView[];
  slotLocked?: boolean;
  canRequest?: boolean;
};

const initialState: RequestRefundState = {};

const ERROR_KEYS = new Set([
  "deadline_passed",
  "already_requested",
  "no_transfer",
  "invalid",
  "unauthorized",
  "not_found",
  "not_paid",
]);

function latestByType(requests: RefundRequestView[]) {
  const latest: Partial<Record<"SLOT" | "TRANSFER", RefundRequestView>> = {};
  for (const request of requests) {
    if (!latest[request.type]) latest[request.type] = request;
  }
  return latest;
}

function isLocked(status: RefundRequestView["status"] | undefined) {
  return status === "PENDING" || status === "CONFIRMED";
}

export function RefundRequestButton({
  registrationId,
  hasTransfer,
  requests,
  slotLocked = false,
  canRequest = true,
}: Props) {
  const t = useTranslations("Account");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [state, formAction, pending] = useActionState(requestRefundAction, initialState);

  const latest = latestByType(requests);
  if (state.success && state.type) {
    latest[state.type] = { type: state.type, status: "PENDING" };
  }

  const slotStatus = latest.SLOT?.status;
  const transferStatus = latest.TRANSFER?.status;
  const slotPending = isLocked(slotStatus);
  const transferPending = isLocked(transferStatus);
  const slotAvailable = canRequest && !slotLocked && !slotPending;
  const transferAvailable = canRequest && hasTransfer && !transferPending;

  const [type, setType] = useState<"SLOT" | "TRANSFER">(slotAvailable ? "SLOT" : "TRANSFER");
  const canSubmit = (type === "SLOT" && slotAvailable) || (type === "TRANSFER" && transferAvailable);

  useEffect(() => {
    if (slotAvailable) setType("SLOT");
    else if (transferAvailable) setType("TRANSFER");
  }, [slotAvailable, transferAvailable]);

  useEffect(() => {
    if (!state.success) return;
    setOpen(false);
    setReason("");
    router.refresh();
  }, [state.success, router]);

  const statusClass = (status: RefundRequestView["status"]) =>
    status === "CONFIRMED" ? "text-spruce" : status === "REJECTED" ? "text-danger" : "text-warn";

  return (
    <>
      {(latest.SLOT || latest.TRANSFER) && (
        <div className="flex flex-col items-end gap-0.5">
          {latest.SLOT && (
            <span className={`text-xs font-semibold ${statusClass(latest.SLOT.status)}`}>
              {t("refundTypeSlot")}: {t(`refundStatus_${latest.SLOT.status}`)}
            </span>
          )}
          {latest.TRANSFER && (
            <span className={`text-xs font-semibold ${statusClass(latest.TRANSFER.status)}`}>
              {t("refundTypeTransfer")}: {t(`refundStatus_${latest.TRANSFER.status}`)}
            </span>
          )}
        </div>
      )}

      {canRequest && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-semibold text-danger hover:underline"
        >
          {t("refundRequestCta")}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-[var(--radius-l)] border border-border bg-surface p-6 shadow-xl">
            <h2 className="mb-1 font-display text-lg font-bold text-ink">{t("refundDialogTitle")}</h2>
            <p className="mb-5 text-sm text-ink-soft">{t("refundDialogHint")}</p>

            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="registrationId" value={registrationId} />
              <input type="hidden" name="refundType" value={type} />

              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">{t("refundTypeLabel")}</span>
                {!slotLocked && (
                  <label className={`flex cursor-pointer items-center gap-2.5 text-sm ${slotPending ? "opacity-40" : "text-ink"}`}>
                    <input
                      type="radio"
                      checked={type === "SLOT"}
                      onChange={() => setType("SLOT")}
                      disabled={slotPending}
                      className="accent-ember"
                    />
                    {t("refundOptionSlot")}
                  </label>
                )}
                {slotLocked && (
                  <p className="text-xs text-ink-faint">{t("refundSlotLocked")}</p>
                )}
                {hasTransfer && (
                  <label className={`flex cursor-pointer items-center gap-2.5 text-sm ${transferPending ? "opacity-40" : "text-ink"}`}>
                    <input
                      type="radio"
                      checked={type === "TRANSFER"}
                      onChange={() => setType("TRANSFER")}
                      disabled={transferPending}
                      className="accent-ember"
                    />
                    {t("refundOptionTransfer")}
                  </label>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-ink-faint">
                  {t("refundReasonLabel")}{" "}
                  <span className="font-normal normal-case tracking-normal text-ink-faint">
                    {t("refundReasonOptional")}
                  </span>
                </label>
                <textarea
                  name="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full resize-y rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
                />
              </div>

              {state.error && (
                <p className="text-sm text-danger">
                  {t(`refundError_${ERROR_KEYS.has(state.error) ? state.error : "invalid"}`)}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={pending || !canSubmit}
                  className="rounded-[var(--radius-s)] bg-danger px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {pending ? t("refundSubmitting") : t("refundSubmitCta")}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--radius-s)] border border-border px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
                >
                  {t("refundAbortCta")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
