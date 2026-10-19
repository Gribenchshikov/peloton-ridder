export type PayableRegistration = {
  isTransferOnly: boolean;
  discountAmount: number | null;
  includesTransfer: boolean;
  distance: { price: number } | null;
  event: { transferPrice: number | null };
};

export function registrationPaymentAmount(registration: PayableRegistration): number {
  if (registration.isTransferOnly) return Math.max(0, registration.event.transferPrice ?? 0);
  const slotPrice = registration.distance?.price ?? 0;
  const discount = registration.discountAmount ?? 0;
  const transferAmt = registration.includesTransfer ? (registration.event.transferPrice ?? 0) : 0;
  return Math.max(0, slotPrice - discount + transferAmt);
}

/** Стоимость участия (слот): цена дистанции минус скидка, без трансфера. */
export function slotRefundAmount(registration: PayableRegistration): number {
  if (registration.isTransferOnly) return 0;
  const price = registration.distance?.price ?? 0;
  const discount = registration.discountAmount ?? 0;
  return Math.max(0, price - discount);
}

export function transferRefundAmount(registration: PayableRegistration): number {
  if (!registration.includesTransfer && !registration.isTransferOnly) return 0;
  return Math.max(0, registration.event.transferPrice ?? 0);
}

/** Сумма к возврату по позиции: слот = участие, трансфер = цена трансфера. */
export function refundRequestAmount(registration: PayableRegistration, type: "SLOT" | "TRANSFER"): number {
  return type === "TRANSFER" ? transferRefundAmount(registration) : slotRefundAmount(registration);
}

export function displayRefundAmount(
  stored: number | null | undefined,
  registration: PayableRegistration,
  type: "SLOT" | "TRANSFER",
): number {
  if (typeof stored === "number" && stored > 0) return stored;
  return refundRequestAmount(registration, type);
}

export type TicketPaymentKind = "slot" | "slotAndTransfer" | "transfer";

export function ticketPaymentSummary(
  registration: PayableRegistration,
  options?: { transferPaidSeparately?: boolean },
): { kind: TicketPaymentKind; amount: number } {
  if (registration.isTransferOnly) {
    return { kind: "transfer", amount: transferRefundAmount(registration) };
  }
  const slot = slotRefundAmount(registration);
  if (registration.includesTransfer && !options?.transferPaidSeparately) {
    return { kind: "slotAndTransfer", amount: slot + transferRefundAmount(registration) };
  }
  return { kind: "slot", amount: slot };
}
