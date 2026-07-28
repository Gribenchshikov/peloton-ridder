"use client";

import { useActionState } from "react";
import { useFormatter } from "next-intl";
import { confirmRefundAction, rejectRefundAction, type RefundActionState } from "./actions";

type RefundRow = {
  id: string;
  type: "SLOT" | "TRANSFER";
  reason: string | null;
  requestedAt: Date;
  registration: {
    id: string;
    user: { firstName: string; lastName: string; email: string };
    distance: { name: string } | null;
  };
};

const TYPE_LABELS = { SLOT: "Слот", TRANSFER: "Трансфер" };

const initialState: RefundActionState = {};

function RefundRow({ refund, eventId }: { refund: RefundRow; eventId: string }) {
  const format = useFormatter();
  const boundConfirm = confirmRefundAction.bind(null, refund.id, eventId);
  const boundReject = rejectRefundAction.bind(null, refund.id, eventId, "");
  const [confirmState, confirmAction, confirmPending] = useActionState(boundConfirm, initialState);
  const [rejectState, rejectAction, rejectPending] = useActionState(boundReject, initialState);

  if (confirmState.success || rejectState.success) {
    return null;
  }

  const error = confirmState.error ?? rejectState.error;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-surface-2">
      <td className="px-4 py-3 font-medium text-ink">
        {refund.registration.user.firstName} {refund.registration.user.lastName}
        <div className="text-xs text-ink-faint">{refund.registration.user.email}</div>
      </td>
      <td className="px-4 py-3 text-ink-soft">
        {refund.registration.distance?.name ?? "Трансфер"}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
          refund.type === "SLOT"
            ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
            : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        }`}>
          {TYPE_LABELS[refund.type]}
        </span>
      </td>
      <td className="max-w-48 px-4 py-3 text-xs text-ink-soft">{refund.reason ?? "—"}</td>
      <td className="px-4 py-3 text-xs tabular-nums text-ink-faint">
        {format.dateTime(refund.requestedAt, { day: "numeric", month: "short" })}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <form action={confirmAction}>
            <button
              type="submit"
              disabled={confirmPending || rejectPending}
              className="rounded-[var(--radius-s)] bg-spruce px-3 py-1.5 text-xs font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {confirmPending ? "…" : "Подтвердить"}
            </button>
          </form>
          <form action={rejectAction}>
            <button
              type="submit"
              disabled={confirmPending || rejectPending}
              className="rounded-[var(--radius-s)] border border-border px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-surface-2 disabled:opacity-50"
            >
              {rejectPending ? "…" : "Отклонить"}
            </button>
          </form>
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </td>
    </tr>
  );
}

export function RefundRequestsSection({
  refunds,
  eventId,
}: {
  refunds: RefundRow[];
  eventId: string;
}) {
  if (refunds.length === 0) return null;

  return (
    <div>
      <h2 className="font-display text-base font-bold text-ink">
        Заявки на возврат{" "}
        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-bold text-white">
          {refunds.length}
        </span>
      </h2>
      <div className="mt-3 overflow-x-auto rounded-[var(--radius-m)] border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">Участник</th>
              <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">Дистанция</th>
              <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">Тип</th>
              <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">Причина</th>
              <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">Дата</th>
              <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">Действие</th>
            </tr>
          </thead>
          <tbody>
            {refunds.map((r) => (
              <RefundRow key={r.id} refund={r} eventId={eventId} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
