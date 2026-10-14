import { prisma } from "@/lib/prisma";
import {
  findPaidInvoiceForOrder,
  getInvoice,
  invoiceAvailableForRefund,
  isApipayConfigured,
  refundInvoice,
} from "@/lib/apipay";
import { reassignPaidBibNumbers } from "@/lib/bibNumbers";
import {
  refundRequestAmount,
  registrationPaymentAmount,
  type PayableRegistration,
} from "@/lib/paymentAmount";
import { notifyFromRegistration } from "@/lib/userMessages";

export const CLEARED_PAYMENT_FIELDS = {
  kaspiOrderId: null,
  kaspiPaymentUrl: null,
  kaspiQrImageUrl: null,
  kaspiQrExpiresAt: null,
};

type DbClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0] | typeof prisma;

export async function applySlotRefundToRegistration(
  db: DbClient,
  registrationId: string,
  options?: { keepTransfer?: boolean },
) {
  const registration = await db.registration.findUnique({
    where: { id: registrationId },
    select: { includesTransfer: true, isTransferOnly: true },
  });
  if (!registration) return;

  const keepTransfer = Boolean(
    options?.keepTransfer ?? (registration.includesTransfer && !registration.isTransferOnly),
  );

  if (keepTransfer) {
    await db.registration.update({
      where: { id: registrationId },
      data: {
        isTransferOnly: true,
        distanceId: null,
        bibNumber: null,
        reservedUntil: null,
      },
    });
    return;
  }

  await db.registration.update({
    where: { id: registrationId },
    data: {
      status: "CANCELLED",
      reservedUntil: null,
      bibNumber: null,
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
      isTransferOnly: false,
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
      await applySlotRefundToRegistration(tx, id, { keepTransfer: false });
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
      isTransferOnly: false,
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
  id: true,
  kaspiOrderId: true,
  isTransferOnly: true,
  discountAmount: true,
  includesTransfer: true,
  distance: { select: { price: true } },
  event: { select: { transferPrice: true } },
} as const;

function alreadySentToApipay(row: { payoutStatus: string | null; apipayRefundId: string | null }) {
  return Boolean(payoutId(row.apipayRefundId)) || row.payoutStatus === "pending" || row.payoutStatus === "completed";
}

function payoutId(id: number | string | null | undefined) {
  if (id == null || id === 0 || id === "0" || id === "undefined") return null;
  return String(id);
}

export async function payoutRegistrationRefund(
  registrationId: string,
  type: "SLOT" | "TRANSFER",
  overrideAmount?: number | null,
): Promise<PayoutResult> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: PAYABLE_SELECT,
  });
  if (!registration) {
    return { amount: 0, payoutStatus: "skipped", apipayRefundId: null };
  }

  const requested =
    overrideAmount != null && overrideAmount > 0
      ? overrideAmount
      : refundRequestAmount(registration as PayableRegistration, type);
  if (requested < 1) {
    console.warn("[apipay] refund skipped: amount is 0", { registrationId, type });
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
    return { amount: requested, payoutStatus: status, apipayRefundId: sent.apipayRefundId };
  }

  if (!isApipayConfigured()) {
    console.warn("[apipay] refund skipped: APIPAY_API_KEY is not set", { registrationId, type });
    return { amount: requested, payoutStatus: "skipped", apipayRefundId: null };
  }

  const invoice = await findPaidInvoiceForOrder(registration.id, registration.kaspiOrderId);
  if (!invoice) {
    console.warn("[apipay] refund skipped: paid invoice not found", {
      registrationId,
      type,
      kaspiOrderId: registration.kaspiOrderId,
    });
    return { amount: requested, payoutStatus: "skipped", apipayRefundId: null };
  }

  if (registration.kaspiOrderId !== String(invoice.id)) {
    await prisma.registration.update({
      where: { id: registrationId },
      data: { kaspiOrderId: String(invoice.id) },
    });
  }

  const available = invoiceAvailableForRefund(invoice);
  const amount = Number.isFinite(available) ? Math.min(requested, available) : requested;
  if (amount < 1) {
    console.warn("[apipay] refund skipped: nothing left on invoice", { registrationId, type, invoiceId: invoice.id });
    return { amount: 0, payoutStatus: "skipped", apipayRefundId: null };
  }

  try {
    const refund = await refundInvoice(invoice.id, amount);
    const apipayRefundId = payoutId(refund.id);
    return {
      amount,
      payoutStatus: refund.status === "failed" ? "failed" : "pending",
      apipayRefundId,
    };
  } catch (error) {
    console.error("[apipay] refund failed:", error);
    return { amount, payoutStatus: "failed", apipayRefundId: null };
  }
}

async function payoutRemainingInvoice(registrationId: string): Promise<PayoutResult> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: PAYABLE_SELECT,
  });
  if (!registration) {
    return { amount: 0, payoutStatus: "skipped", apipayRefundId: null };
  }

  const requested = registrationPaymentAmount(registration as PayableRegistration);
  if (requested < 1) {
    return { amount: 0, payoutStatus: "skipped", apipayRefundId: null };
  }
  if (!isApipayConfigured()) {
    console.warn("[apipay] refund skipped: APIPAY_API_KEY is not set", { registrationId });
    return { amount: requested, payoutStatus: "skipped", apipayRefundId: null };
  }

  const invoice = await findPaidInvoiceForOrder(registration.id, registration.kaspiOrderId);
  if (!invoice) {
    console.warn("[apipay] refund skipped: paid invoice not found", { registrationId });
    return { amount: requested, payoutStatus: "skipped", apipayRefundId: null };
  }
  if (registration.kaspiOrderId !== String(invoice.id)) {
    await prisma.registration.update({
      where: { id: registrationId },
      data: { kaspiOrderId: String(invoice.id) },
    });
  }

  try {
    const refund = await refundInvoice(invoice.id);
    return {
      amount: requested,
      payoutStatus: refund.status === "failed" ? "failed" : "pending",
      apipayRefundId: payoutId(refund.id),
    };
  } catch (error) {
    console.error("[apipay] refund failed:", error);
    return { amount: requested, payoutStatus: "failed", apipayRefundId: null };
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
    const transferPayout = await payoutRegistrationRefund(registrationId, "TRANSFER");
    if (transferPayout.amount > 0) {
      const pendingTransfer = await prisma.refundRequest.findFirst({
        where: { registrationId, type: "TRANSFER", status: "PENDING" },
        orderBy: { requestedAt: "desc" },
        select: { id: true },
      });
      const transferData = {
        amount: transferPayout.amount,
        apipayRefundId: transferPayout.apipayRefundId,
        payoutStatus: transferPayout.payoutStatus,
      };
      if (pendingTransfer) {
        await prisma.refundRequest.update({
          where: { id: pendingTransfer.id },
          data: {
            status: "CONFIRMED",
            resolvedAt: new Date(),
            adminNote: "Отмена администратором",
            ...transferData,
          },
        });
      } else {
        await prisma.refundRequest.create({
          data: {
            registrationId,
            type: "TRANSFER",
            status: "CONFIRMED",
            reason: "Отмена администратором",
            resolvedAt: new Date(),
            ...transferData,
          },
        });
      }
      await notifyFromRegistration(registrationId, "REFUND_TRANSFER", { amount: transferPayout.amount });
    }
    await rejectLeftoverPending(registrationId);
    return;
  }

  const payout = await payoutRemainingInvoice(registrationId);

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
  if (payout.amount > 0) {
    await notifyFromRegistration(registrationId, "REFUND_SLOT", { amount: payout.amount });
  }
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
    select: { id: true, eventId: true, status: true, includesTransfer: true, isTransferOnly: true },
  });
  if (!registration) return;
  if (registration.status !== "PAID" && registration.status !== "RESERVED") return;
  if (registration.isTransferOnly) return;

  await prisma.$transaction(async (tx) => {
    await applySlotRefundToRegistration(tx, registration.id, {
      keepTransfer: registration.includesTransfer,
    });
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

function needsApipayRetry(row: { payoutStatus: string | null; apipayRefundId: string | null }) {
  if (alreadySentToApipay(row)) return false;
  return row.payoutStatus == null || row.payoutStatus === "skipped" || row.payoutStatus === "failed";
}

/** Досылает в ApiPay подтверждённые возвраты, которые раньше ушли как skipped/failed. */
export async function retrySkippedRefundPayouts(registrationId?: string) {
  const rows = await prisma.refundRequest.findMany({
    where: {
      status: "CONFIRMED",
      ...(registrationId ? { registrationId } : {}),
    },
    select: {
      id: true,
      type: true,
      registrationId: true,
      amount: true,
      payoutStatus: true,
      apipayRefundId: true,
    },
    orderBy: [{ type: "asc" }, { resolvedAt: "asc" }],
  });

  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!needsApipayRetry(row)) continue;
    latest.set(`${row.registrationId}:${row.type}`, row);
  }
  const pending = [...latest.values()].sort((a, b) => a.type.localeCompare(b.type));
  let sent = 0;
  for (const row of pending) {
    const payout = await payoutRegistrationRefund(row.registrationId, row.type, row.amount);
    await prisma.refundRequest.update({
      where: { id: row.id },
      data: {
        amount: payout.amount || row.amount,
        apipayRefundId: payout.apipayRefundId,
        payoutStatus: payout.payoutStatus,
      },
    });
    if (payout.payoutStatus === "pending" || payout.payoutStatus === "completed") {
      sent += 1;
    }
  }
  return sent;
}
