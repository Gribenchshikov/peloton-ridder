export type RegistrationStatusValue = "RESERVED" | "PAID" | "CANCELLED";
export type DisplayRegistrationStatus = RegistrationStatusValue | "REFUNDED";

type RefundLike = { type: string; status: string };

export function hasConfirmedSlotRefund(requests: RefundLike[] | undefined) {
  return Boolean(requests?.some((r) => r.type === "SLOT" && r.status === "CONFIRMED"));
}

export function hasConfirmedTransferRefund(requests: RefundLike[] | undefined) {
  return Boolean(requests?.some((r) => r.type === "TRANSFER" && r.status === "CONFIRMED"));
}

export type DisplayTransferStatus = "YES" | "REFUNDED" | "NONE";

/** Текущий трансфер важнее старой заявки: после повторной оплаты снова «Да». */
export function displayTransferStatus(
  hasTransfer: boolean,
  requests: RefundLike[] | undefined,
): DisplayTransferStatus {
  if (hasTransfer) return "YES";
  if (hasConfirmedTransferRefund(requests)) return "REFUNDED";
  return "NONE";
}

export function displayRegistrationStatus(
  status: RegistrationStatusValue,
  requests: RefundLike[] | undefined,
): DisplayRegistrationStatus {
  if (status === "CANCELLED" && hasConfirmedSlotRefund(requests)) return "REFUNDED";
  return status;
}

/** Одобренный возврат скрываем, если слот/трансфер снова оплачены. */
export function isCurrentRefundStatus(
  request: RefundLike,
  opts: { registrationStatus: RegistrationStatusValue; hasTransfer: boolean },
) {
  if (request.status !== "CONFIRMED") return true;
  if (request.type === "SLOT") return opts.registrationStatus === "CANCELLED";
  if (request.type === "TRANSFER") return !opts.hasTransfer;
  return true;
}
