export type RegistrationStatusValue = "RESERVED" | "PAID" | "CANCELLED";
export type DisplayRegistrationStatus = RegistrationStatusValue | "REFUNDED";

type RefundLike = {
  type: string;
  status: string;
  requestedAt?: Date | string;
  resolvedAt?: Date | string | null;
  invoiceId?: string | null;
};

export function refundMatchesCurrentInvoice(
  request: { invoiceId?: string | null },
  invoiceId: string | null | undefined,
  reregistrationCount = 0,
) {
  if (request.invoiceId) return request.invoiceId === invoiceId;
  return Boolean(invoiceId) && reregistrationCount === 0;
}

export function hasConfirmedSlotRefund(
  requests: RefundLike[] | undefined,
  opts?: { invoiceId?: string | null; reregistrationCount?: number },
) {
  const confirmed = requests?.filter((r) => r.type === "SLOT" && r.status === "CONFIRMED") ?? [];
  if (confirmed.length === 0) return false;
  if (!opts) return true;
  return confirmed.some((r) =>
    refundMatchesCurrentInvoice(r, opts.invoiceId, opts.reregistrationCount ?? 0),
  );
}

export function hasConfirmedTransferRefund(requests: RefundLike[] | undefined) {
  return Boolean(requests?.some((r) => r.type === "TRANSFER" && r.status === "CONFIRMED"));
}

export type DisplayTransferStatus = "YES" | "REFUNDED" | "NONE";

/** Трансфер куплен вместе со слотом или отдельной оплатой. */
export function isTransferPassengerRegistration(reg: {
  includesTransfer: boolean;
  isTransferOnly: boolean;
  refundRequests?: { type: string }[];
}) {
  return (
    reg.isTransferOnly ||
    reg.includesTransfer ||
    Boolean(reg.refundRequests?.some((req) => req.type === "TRANSFER"))
  );
}

export function displayTransferStatus(
  hasTransfer: boolean,
  requests: RefundLike[] | undefined,
): DisplayTransferStatus {
  if (hasTransfer) return "YES";
  if (hasConfirmedTransferRefund(requests)) return "REFUNDED";
  return "NONE";
}

/** Активный оплаченный трансфер, по которому можно отметить посадку. */
export function canBoardTransfer(reg: {
  status: string;
  includesTransfer: boolean;
}): boolean {
  return reg.status === "PAID" && reg.includesTransfer;
}

export const TRANSFER_REFUNDED_BOARDING_MESSAGE =
  "Был произведён возврат оплаты за трансфер";

export function isTransferRefunded(reg: {
  status: string;
  includesTransfer: boolean;
  isTransferOnly: boolean;
  refundRequests?: RefundLike[];
}): boolean {
  if (canBoardTransfer(reg)) return false;
  return (
    hasConfirmedTransferRefund(reg.refundRequests) ||
    (reg.isTransferOnly && reg.status === "CANCELLED")
  );
}

export function displayRegistrationStatus(
  status: RegistrationStatusValue,
  requests: RefundLike[] | undefined,
  opts?: { invoiceId?: string | null; reregistrationCount?: number },
): DisplayRegistrationStatus {
  if (status === "CANCELLED" && hasConfirmedSlotRefund(requests, opts)) return "REFUNDED";
  return status;
}

/** Одобренный возврат скрываем, если слот/трансфер снова оплачены. */
export function isCurrentRefundStatus(
  request: RefundLike,
  opts: { registrationStatus: RegistrationStatusValue; hasTransfer: boolean; hasSlot?: boolean },
) {
  if (request.status !== "CONFIRMED") return true;
  if (request.type === "SLOT") {
    if (opts.registrationStatus === "CANCELLED") return true;
    return opts.registrationStatus === "PAID" && opts.hasSlot === false;
  }
  if (request.type === "TRANSFER") return !opts.hasTransfer;
  return true;
}

function refundTime(value: Date | string | null | undefined) {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/** После повторной оплаты не показываем заявки прошлого цикла, в том числе автоотклонения. */
export function visibleAccountRefunds<T extends RefundLike>(
  requests: T[] | undefined,
  opts: { registrationStatus: RegistrationStatusValue; hasTransfer: boolean; hasSlot?: boolean },
): T[] {
  const all = requests ?? [];
  const current = all.filter((request) => isCurrentRefundStatus(request, opts));
  if (opts.registrationStatus === "CANCELLED") return current;
  if (opts.hasSlot === false) return current;

  const lastSlotRefund = all
    .filter((request) => request.type === "SLOT" && request.status === "CONFIRMED")
    .sort(
      (a, b) =>
        refundTime(b.resolvedAt ?? b.requestedAt) - refundTime(a.resolvedAt ?? a.requestedAt),
    )[0];
  if (!lastSlotRefund) return current;

  const cutoff = refundTime(lastSlotRefund.resolvedAt ?? lastSlotRefund.requestedAt);
  return current.filter((request) => refundTime(request.requestedAt) > cutoff);
}
