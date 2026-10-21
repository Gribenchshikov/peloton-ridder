"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter } from "next-intl";
import { compareInvoiceDesc, expandRegistrationPayments } from "@/lib/invoiceDisplay";
import { canBoardTransfer, displayTransferStatus, isTransferPassengerRegistration, isTransferRefunded, TRANSFER_REFUNDED_BOARDING_MESSAGE, transferPassengerBadge } from "@/lib/registrationStatus";
import { adminRefundTransferAction, toggleTransferBoardedAction } from "./actions";

type TransferRow = {
  id: string;
  status: "RESERVED" | "PAID" | "CANCELLED";
  createdAt: Date;
  includesTransfer: boolean;
  isTransferOnly: boolean;
  transferUsedAt: Date | null;
  kaspiOrderId?: string | null;
  paidInvoiceIds?: string[];
  paidInvoiceAt?: unknown;
  user: { firstName: string; lastName: string; phone: string | null };
  refundRequests?: { type: string; status: string }[];
};

function InlineCheckbox({
  checked: initialChecked,
  onToggle,
  disabled = false,
}: {
  checked: boolean;
  onToggle?: (next: boolean) => Promise<{ error?: string }>;
  disabled?: boolean;
}) {
  const [checked, setChecked] = useState(initialChecked);
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (disabled || !onToggle) return;
    const next = e.target.checked;
    setChecked(next);
    startTransition(async () => {
      const res = await onToggle(next);
      if (res.error) setChecked(!next);
    });
  }

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={handleChange}
      disabled={disabled || pending}
      title={disabled ? TRANSFER_REFUNDED_BOARDING_MESSAGE : undefined}
      className="h-4 w-4 accent-ember disabled:cursor-not-allowed disabled:opacity-40"
    />
  );
}

function TransferStatusBadge({
  reg,
  paymentStatus,
  isCurrent,
}: {
  reg: TransferRow;
  paymentStatus: "paid" | "cancelled" | "reserved";
  isCurrent: boolean;
}) {
  const kind = transferPassengerBadge({
    status: reg.status,
    includesTransfer: reg.includesTransfer,
    isTransferOnly: reg.isTransferOnly,
    refundRequests: reg.refundRequests,
    paymentStatus,
    isCurrent,
  });
  const styles: Record<typeof kind, string> = {
    paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    cancelled: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    reserved: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    refunded: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    pending: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  };
  const labels: Record<typeof kind, string> = {
    paid: "Оплачено",
    cancelled: "Отменено",
    reserved: "Бронь",
    refunded: "Возврат",
    pending: "Заявка на возврат",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${styles[kind]}`}>
      {labels[kind]}
    </span>
  );
}

function RefundButton({ registrationId, eventId }: { registrationId: string; eventId: string }) {
  const bound = adminRefundTransferAction.bind(null, registrationId, eventId);
  const [state, action, pending] = useActionState(bound, {});
  const router = useRouter();
  const waitingForApipay = state.error === "payout_pending";

  useEffect(() => {
    if (!waitingForApipay) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      router.refresh();
      if (tries >= 24) clearInterval(timer);
    }, 5000);
    return () => clearInterval(timer);
  }, [router, waitingForApipay]);

  if (state.success) return <span className="text-xs font-semibold text-spruce">Возврат отправлен</span>;
  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input
        name="totp"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        required
        placeholder="Код 2FA"
        className="w-24 rounded-[var(--radius-s)] border border-border bg-surface px-2 py-1 text-xs text-ink"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-s)] border border-danger/30 px-2 py-1 text-xs font-semibold text-danger transition-colors hover:bg-danger/5 disabled:opacity-60"
      >
        {pending ? "…" : "Возврат"}
      </button>
      {state.error && (
        <p className="mt-1 text-[11px] text-danger">
          {state.error === "payout_failed"
            ? "Не удалось отправить возврат в ApiPay"
            : state.error === "payout_pending"
              ? "Возврат отправлен в ApiPay. Статус обновится после подтверждения."
              : state.error === "invalid_2fa"
                ? "Неверный код 2FA"
                : "Ошибка"}
        </p>
      )}
    </form>
  );
}

export function TransferPassengersSection({
  eventId,
  registrations,
}: {
  eventId: string;
  registrations: TransferRow[];
}) {
  const format = useFormatter();
  const rows = registrations.filter(isTransferPassengerRegistration);
  if (rows.length === 0) {
    return <p className="text-sm text-ink-faint">Нет заказов трансфера.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-[var(--radius-m)] border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">№</th>
              <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">Имя</th>
              <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">Телефон</th>
              <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">Статус</th>
              <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">Дата оплаты</th>
              <th className="px-4 py-2.5 text-left font-semibold text-ink-soft">Номер счёта</th>
              <th className="px-4 py-2.5 text-center font-semibold text-ink-soft">Посадка</th>
              <th className="px-4 py-2.5 text-right font-semibold text-ink-soft">Действие</th>
            </tr>
          </thead>
          <tbody>
            {rows.flatMap((reg) => {
              const hasTransfer = displayTransferStatus(reg.includesTransfer, reg.refundRequests) === "YES";
              const transferRefundPending = reg.refundRequests?.some(
                (request) => request.type === "TRANSFER" && request.status === "PENDING",
              );
              return expandRegistrationPayments(reg).map((payment) => ({
                reg,
                payment,
                hasTransfer,
                transferRefundPending,
              }));
            }).sort((a, b) => compareInvoiceDesc(a.payment.invoiceId, b.payment.invoiceId)).map(({ reg, payment, hasTransfer, transferRefundPending }, idx) => {
              const canBoard =
                payment.isCurrent &&
                payment.paymentStatus !== "cancelled" &&
                canBoardTransfer(reg);
              const boardingLocked =
                !canBoard &&
                (
                  !payment.isCurrent ||
                  payment.paymentStatus === "cancelled" ||
                  reg.status === "CANCELLED" ||
                  isTransferRefunded(reg)
                );
              return (
                <tr key={`${reg.id}-${payment.invoiceId ?? "none"}`} className="border-b border-border last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-2.5 tabular-nums text-ink-faint">{idx + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-ink">
                    {reg.user.firstName} {reg.user.lastName}
                  </td>
                  <td className="px-4 py-2.5 text-ink-soft">{reg.user.phone ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <TransferStatusBadge
                      reg={reg}
                      paymentStatus={payment.paymentStatus}
                      isCurrent={payment.isCurrent}
                    />
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-ink-faint">
                    {payment.paidAt
                      ? format.dateTime(payment.paidAt, { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-ink-soft">
                    {payment.invoiceId ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {canBoard ? (
                      <InlineCheckbox
                        checked={reg.transferUsedAt !== null}
                        onToggle={(v) => toggleTransferBoardedAction(reg.id, eventId, v)}
                      />
                    ) : boardingLocked ? (
                      <InlineCheckbox checked={false} disabled />
                    ) : (
                      <span className="text-xs text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {payment.isCurrent && reg.status === "PAID" && hasTransfer && !transferRefundPending ? (
                      <RefundButton registrationId={reg.id} eventId={eventId} />
                    ) : (
                      <span className="text-xs text-ink-faint">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
