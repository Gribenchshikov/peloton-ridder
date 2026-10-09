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

export function refundRequestAmount(registration: PayableRegistration, type: "SLOT" | "TRANSFER"): number {
  if (type === "TRANSFER") {
    if (!registration.includesTransfer && !registration.isTransferOnly) return 0;
    return Math.max(0, registration.event.transferPrice ?? 0);
  }
  return registrationPaymentAmount(registration);
}
