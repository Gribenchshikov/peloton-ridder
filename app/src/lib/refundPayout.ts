import { prisma } from "@/lib/prisma";
import { isApipayConfigured, refundInvoice } from "@/lib/apipay";
import { refundRequestAmount, type PayableRegistration } from "@/lib/paymentAmount";

export type PayoutResult = {
  amount: number;
  payoutStatus: "skipped" | "pending" | "failed" | "completed";
  apipayRefundId: string | null;
};

const PAYABLE_SELECT = {
  kaspiOrderId: true,
  isTransferOnly: true,
  discountAmount: true,
  includesTransfer: true,
  distance: { select: { price: true } },
  event: { select: { transferPrice: true } },
} as const;

function alreadySentToApipay(row: { payoutStatus: string | null; apipayRefundId: string | null }) {
  return Boolean(row.apipayRefundId) || row.payoutStatus === "pending" || row.payoutStatus === "completed";
}

export async function payoutRegistrationRefund(
  registrationId: string,
  type: "SLOT" | "TRANSFER",
): Promise<PayoutResult> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: PAYABLE_SELECT,
  });
  if (!registration) {
    return { amount: 0, payoutStatus: "skipped", apipayRefundId: null };
  }

  const amount = refundRequestAmount(registration as PayableRegistration, type);
  if (amount < 1) {
    return { amount: 0, payoutStatus: "skipped", apipayRefundId: null };
  }

  const prior = await prisma.refundRequest.findMany({
    where: { registrationId, type },
    select: { payoutStatus: true, apipayRefundId: true },
  });
  const sent = prior.find(alreadySentToApipay);
  if (sent) {
    const status =
      sent.payoutStatus === "completed" || sent.payoutStatus === "pending" || sent.payoutStatus === "failed"
        ? sent.payoutStatus
        : "skipped";
    return { amount, payoutStatus: status, apipayRefundId: sent.apipayRefundId };
  }

  if (!registration.kaspiOrderId || !isApipayConfigured()) {
    return { amount, payoutStatus: "skipped", apipayRefundId: null };
  }

  try {
    const refund = await refundInvoice(
      registration.kaspiOrderId,
      type === "SLOT" ? undefined : amount,
    );
    return {
      amount,
      payoutStatus: refund.status === "failed" ? "failed" : "pending",
      apipayRefundId: String(refund.id),
    };
  } catch (error) {
    console.error("[apipay] refund failed:", error);
    return { amount, payoutStatus: "failed", apipayRefundId: null };
  }
}

export async function refundPaidRegistrationOnAdminCancel(registrationId: string) {
  const existingSlot = await prisma.refundRequest.findFirst({
    where: { registrationId, type: "SLOT", status: "CONFIRMED" },
    orderBy: { resolvedAt: "desc" },
    select: { id: true, amount: true, payoutStatus: true, apipayRefundId: true },
  });

  const alreadyPaidOut = existingSlot && (existingSlot.amount != null || alreadySentToApipay(existingSlot));
  if (alreadyPaidOut) {
    await rejectLeftoverPending(registrationId);
    return;
  }

  const payout = await payoutRegistrationRefund(registrationId, "SLOT");

  const pendingSlot = await prisma.refundRequest.findFirst({
    where: { registrationId, type: "SLOT", status: "PENDING" },
    orderBy: { requestedAt: "desc" },
    select: { id: true },
  });

  if (pendingSlot) {
    await prisma.refundRequest.update({
      where: { id: pendingSlot.id },
      data: {
        status: "CONFIRMED",
        resolvedAt: new Date(),
        adminNote: "Отмена администратором",
        amount: payout.amount,
        apipayRefundId: payout.apipayRefundId,
        payoutStatus: payout.payoutStatus,
      },
    });
  } else if (existingSlot) {
    await prisma.refundRequest.update({
      where: { id: existingSlot.id },
      data: {
        amount: payout.amount,
        apipayRefundId: payout.apipayRefundId,
        payoutStatus: payout.payoutStatus,
      },
    });
  } else {
    await prisma.refundRequest.create({
      data: {
        registrationId,
        type: "SLOT",
        status: "CONFIRMED",
        reason: "Отмена администратором",
        resolvedAt: new Date(),
        amount: payout.amount,
        apipayRefundId: payout.apipayRefundId,
        payoutStatus: payout.payoutStatus,
      },
    });
  }

  await rejectLeftoverPending(registrationId);
}

export async function markInvoiceRefunded(invoiceId: string, refundId?: string | number | null) {
  if (refundId != null) {
    const byId = await prisma.refundRequest.updateMany({
      where: { apipayRefundId: String(refundId) },
      data: { payoutStatus: "completed" },
    });
    if (byId.count > 0) return;
  }

  await prisma.refundRequest.updateMany({
    where: {
      payoutStatus: { in: ["pending", "failed"] },
      registration: { kaspiOrderId: invoiceId },
    },
    data: { payoutStatus: "completed" },
  });
}

async function rejectLeftoverPending(registrationId: string) {
  await prisma.refundRequest.updateMany({
    where: { registrationId, status: "PENDING" },
    data: {
      status: "REJECTED",
      resolvedAt: new Date(),
      adminNote: "Отмена администратором: возврат уже выполнен",
    },
  });
}
