import { prisma } from "@/lib/prisma";
import { getInvoice, isApipayConfigured, refundInvoice } from "@/lib/apipay";
import { reassignPaidBibNumbers } from "@/lib/bibNumbers";
import { refundRequestAmount, type PayableRegistration } from "@/lib/paymentAmount";

export const CLEARED_PAYMENT_FIELDS = {
  kaspiOrderId: null,
  kaspiPaymentUrl: null,
  kaspiQrImageUrl: null,
  kaspiQrExpiresAt: null,
};

type DbClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0] | typeof prisma;

export async function applySlotRefundToRegistration(db: DbClient, registrationId: string) {
  await db.registration.update({
    where: { id: registrationId },
    data: {
      status: "CANCELLED",
      reservedUntil: null,
      bibNumber: null,
      ...CLEARED_PAYMENT_FIELDS,
    },
  });
}

function invoiceLooksRefunded(status: string | undefined) {
  return status === "refunded" || status === "partially_refunded";
}

/** Сбрасывает зависший PAID после подтверждённого возврата слота. */
export async function repairStalePaidSlotRefunds(eventId: string) {
  const candidates = await prisma.registration.findMany({
    where: {
      eventId,
      status: "PAID",
      refundRequests: { some: { type: "SLOT", status: "CONFIRMED" } },
    },
    select: { id: true, distanceId: true, kaspiOrderId: true, reregistrationCount: true },
  });
  if (candidates.length === 0) return 0;

  const staleIds: string[] = [];
  for (const row of candidates) {
    if (row.reregistrationCount === 0) {
      staleIds.push(row.id);
      continue;
    }
    if (!row.kaspiOrderId || !isApipayConfigured()) continue;
    try {
      const invoice = await getInvoice(row.kaspiOrderId);
      if (invoiceLooksRefunded(invoice.status)) staleIds.push(row.id);
    } catch (error) {
      console.error("[refund] invoice lookup failed:", error);
    }
  }
  if (staleIds.length === 0) return 0;

  const stale = candidates.filter((row) => staleIds.includes(row.id));
  await prisma.$transaction(async (tx) => {
    const distanceIds = [...new Set(stale.map((row) => row.distanceId).filter(Boolean))] as string[];
    for (const id of distanceIds.sort()) {
      await tx.$queryRaw`SELECT "id" FROM "Distance" WHERE "id" = ${id} FOR UPDATE`;
    }
    for (const id of staleIds) {
      await applySlotRefundToRegistration(tx, id);
    }
    await reassignPaidBibNumbers(tx, eventId);
  });
  return staleIds.length;
}

export async function repairUserStalePaidSlotRefunds(userId: string) {
  const rows = await prisma.registration.findMany({
    where: {
      userId,
      status: "PAID",
      reregistrationCount: 0,
      refundRequests: { some: { type: "SLOT", status: "CONFIRMED" } },
    },
    select: { eventId: true },
    distinct: ["eventId"],
  });
  for (const row of rows) {
    await repairStalePaidSlotRefunds(row.eventId);
  }
}

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
    if (byId.count > 0) {
      await cancelSlotIfRefundedInvoice(invoiceId);
      return;
    }
  }

  await prisma.refundRequest.updateMany({
    where: {
      payoutStatus: { in: ["pending", "failed"] },
      registration: { kaspiOrderId: invoiceId },
    },
    data: { payoutStatus: "completed" },
  });
  await cancelSlotIfRefundedInvoice(invoiceId);
}

async function cancelSlotIfRefundedInvoice(invoiceId: string) {
  const registration = await prisma.registration.findFirst({
    where: {
      OR: [{ kaspiOrderId: invoiceId }],
      refundRequests: { some: { type: "SLOT", status: { in: ["PENDING", "CONFIRMED"] } } },
    },
    select: { id: true, eventId: true, status: true },
  });
  if (!registration) return;
  if (registration.status !== "PAID" && registration.status !== "RESERVED") return;

  await prisma.$transaction(async (tx) => {
    await applySlotRefundToRegistration(tx, registration.id);
    await reassignPaidBibNumbers(tx, registration.eventId);
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
