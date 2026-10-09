export type RegistrationStatusValue = "RESERVED" | "PAID" | "CANCELLED";
export type DisplayRegistrationStatus = RegistrationStatusValue | "REFUNDED";

type RefundLike = { type: string; status: string };

export function hasConfirmedSlotRefund(requests: RefundLike[] | undefined) {
  return Boolean(requests?.some((r) => r.type === "SLOT" && r.status === "CONFIRMED"));
}

export function hasConfirmedTransferRefund(requests: RefundLike[] | undefined) {
  return Boolean(requests?.some((r) => r.type === "TRANSFER" && r.status === "CONFIRMED"));
}

export function displayRegistrationStatus(
  status: RegistrationStatusValue,
  requests: RefundLike[] | undefined,
): DisplayRegistrationStatus {
  if (status === "CANCELLED" && hasConfirmedSlotRefund(requests)) return "REFUNDED";
  return status;
}
